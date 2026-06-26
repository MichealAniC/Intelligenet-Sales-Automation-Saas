import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  alpha,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvided,
  DroppableProvided,
} from "@hello-pangea/dnd";
import { api, updateLeadStatus } from "@/api/http";
import type { LeadSummaryItem, LeadStatus, LeadCategory } from "@/api/types";
import ScoreChip from "@/components/ScoreChip";

const LEAD_STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Converted",
  "Archived",
];

const CATEGORY_ORDER: Record<LeadCategory, number> = {
  Hot: 0,
  Warm: 1,
  Cold: 2,
};

const MAX_DISPLAYED_PER_COLUMN = 20;

export default function Pipeline() {
  const navigate = useNavigate();
  const [items, setItems] = useState<LeadSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await api.get("/leads/ops?limit=1000&offset=0");
        if (mounted) {
          setItems(res.data.items);
        }
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load pipeline");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const columns = useMemo(() => {
    const grouped: Record<string, LeadSummaryItem[]> = {};
    LEAD_STATUS_ORDER.forEach((status) => (grouped[status] = []));
    items.forEach((item) => {
      if (grouped[item.lead.lead_status]) {
        grouped[item.lead.lead_status].push(item);
      }
    });
    // Sort each column by Hot > Warm > Cold
    Object.keys(grouped).forEach((status) => {
      grouped[status].sort((a, b) => {
        const catA = a.score_category ?? "Cold";
        const catB = b.score_category ?? "Cold";
        return CATEGORY_ORDER[catA] - CATEGORY_ORDER[catB];
      });
    });
    return grouped;
  }, [items]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Find the dragged lead
    const draggedLead = items.find((i) => i.lead.lead_id === draggableId);
    if (!draggedLead) return;

    // Optimistic update
    const newItems = [...items];
    const leadIndex = newItems.findIndex((i) => i.lead.lead_id === draggableId);
    if (leadIndex !== -1) {
      newItems[leadIndex] = {
        ...newItems[leadIndex],
        lead: {
          ...newItems[leadIndex].lead,
          lead_status: destination.droppableId as LeadStatus,
        },
      };
      setItems(newItems);
    }

    // Call backend
    try {
      await updateLeadStatus(draggableId, destination.droppableId as LeadStatus);
    } catch (err: any) {
      // Revert on error
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to update lead status");
      // Re-fetch to get current state
      const res = await api.get("/leads/ops?limit=1000&offset=0");
      setItems(res.data.items);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Pipeline Kanban
        </Typography>
        <Typography color="text.secondary">
          Visualize your leads by their current status and drag to reorder.
        </Typography>
      </Stack>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" },
            gap: 2,
          }}
        >
          {LEAD_STATUS_ORDER.map((status) => (
            <Card key={status} sx={{ borderRadius: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              <CardContent sx={{ p: 2, display: "flex", flexDirection: "column", flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography sx={{ fontWeight: 900 }}>{status}</Typography>
                  <Chip
                    label={`${Math.min(columns[status].length, MAX_DISPLAYED_PER_COLUMN)} / ${columns[status].length}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Droppable droppableId={status}>
                  {(provided: DroppableProvided) => (
                    <Stack
                      spacing={1.5}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{ flexGrow: 1 }}
                    >
                      {columns[status].slice(0, MAX_DISPLAYED_PER_COLUMN).map((item, index) => (
                        <Draggable key={item.lead.lead_id} draggableId={item.lead.lead_id} index={index}>
                          {(provided: DraggableProvided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                p: 1.5,
                                cursor: "grab",
                                "&:hover": { bgcolor: "rgba(37, 99, 235, 0.04)" },
                                "&:active": { cursor: "grabbing" },
                              }}
                              onClick={() => navigate(`/app/leads/${encodeURIComponent(item.lead.lead_id)}`)}
                            >
                              <Stack spacing={0.5}>
                                <Typography sx={{ fontWeight: 900, fontSize: "0.875rem" }}>
                                  {item.lead.full_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {item.lead.company_name}
                                </Typography>
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                  <ScoreChip
                                    category={item.score_category ?? "Cold"}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    ₦{Number(item.lead.estimated_annual_revenue).toLocaleString()}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {columns[status].length > MAX_DISPLAYED_PER_COLUMN && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            textAlign: "center",
                            py: 1,
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 1,
                            bgcolor: (theme) => alpha(theme.palette.grey[100], 0.5),
                          }}
                        >
                          + {columns[status].length - MAX_DISPLAYED_PER_COLUMN} more unrendered leads
                        </Typography>
                      )}
                      {provided.placeholder}
                    </Stack>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          ))}
        </Box>
      </DragDropContext>
    </Stack>
  );
}
