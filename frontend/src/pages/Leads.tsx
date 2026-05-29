import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/http";
import type { DashboardOverview, LeadOpsListResponse, LeadSummaryItem } from "@/api/types";
import ScoreChip from "@/components/ScoreChip";
import { useAuthStore } from "@/stores/auth";

export default function Leads() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [items, setItems] = useState<LeadSummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [opsRes, overviewRes] = await Promise.all([
          api.get<LeadOpsListResponse>(
            `/leads/ops?limit=${pageSize}&offset=${page * pageSize}&q=${encodeURIComponent(query)}`
          ),
          api.get<DashboardOverview>("/dashboard/overview"),
        ]);
        if (mounted) {
          setItems(opsRes.data.items);
          setTotal(opsRes.data.total);
          setOverview(overviewRes.data);
        }
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load leads");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [page, pageSize, query]);

  const rows = useMemo(() => {
    return items.map((i) => ({
      id: i.lead.lead_id,
      ...i.lead,
      score_value: i.score_value ?? null,
      score_category: i.score_category ?? null,
      prediction_probability: i.prediction_probability ?? null,
      recommended_action: i.recommended_action ?? null,
      assigned_to_staff_id: i.assigned_to_staff_id ?? null,
      assigned_to_name: i.assigned_to_name ?? null,
      assignment_status: i.assignment_status ?? null,
    }));
  }, [items]);

  const featured = useMemo(() => {
    const withScore = items.filter((i) => typeof i.score_value === "number") as Array<
      LeadSummaryItem & { score_value: number }
    >;
    const topScore = [...withScore].sort((a, b) => (b.score_value ?? 0) - (a.score_value ?? 0))[0] || null;
    const mostEngaged =
      [...items].sort((a, b) => {
        const la = a.lead;
        const lb = b.lead;
        const ea =
          la.website_visits +
          la.pages_viewed +
          la.email_open_rate +
          la.email_click_rate -
          la.last_interaction_days;
        const eb =
          lb.website_visits +
          lb.pages_viewed +
          lb.email_open_rate +
          lb.email_click_rate -
          lb.last_interaction_days;
        return eb - ea;
      })[0] || null;
    return { topScore, mostEngaged };
  }, [items]);

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "lead_id", headerName: "Lead ID", width: 120, sortable: true },
      { field: "full_name", headerName: "Full Name", minWidth: 220, flex: 1 },
      { field: "phone_number", headerName: "Phone", width: 150 },
      { field: "email", headerName: "Email", width: 220 },
      { field: "company_name", headerName: "Company", width: 200 },
      { field: "company_industry", headerName: "Industry", width: 160 },
      {
        field: "score",
        headerName: "Lead Score",
        width: 130,
        renderCell: (params: any) => {
          const v = params.row.score_value;
          return typeof v === "number" ? <Typography sx={{ fontWeight: 900 }}>{v}</Typography> : "—";
        },
      },
      {
        field: "tier",
        headerName: "Lead Tier",
        width: 140,
        sortable: false,
        renderCell: (params: any) => {
          const c = params.row.score_category;
          return c ? <ScoreChip category={c} /> : "—";
        },
      },
      {
        field: "assigned_rep",
        headerName: "Assigned Rep",
        width: 180,
        sortable: false,
        renderCell: (params: any) => {
          const n = params.row.assigned_to_name;
          const s = params.row.assigned_to_staff_id;
          return n || s || "—";
        },
      },
      { field: "lead_status", headerName: "Lead Status", width: 140 },
    ],
    []
  );

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Lead Operations Center
        </Typography>
        <Typography color="text.secondary">
          Manage, prioritize, and inspect lead intelligence across your workspace.
        </Typography>
      </Stack>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary" variant="body2">
              Total Leads
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {overview?.total_leads ?? "—"}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary" variant="body2">
              Hot / Warm / Cold
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {(overview?.hot_count ?? 0).toLocaleString()} / {(overview?.warm_count ?? 0).toLocaleString()} /{" "}
              {(overview?.cold_count ?? 0).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary" variant="body2">
              Assigned / Unassigned
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {(overview?.assigned_leads ?? 0).toLocaleString()} / {(overview?.unassigned_leads ?? 0).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Featured Leads</Typography>
            <Stack spacing={1.5}>
              <Box sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: 2 }}>
                <Typography color="text.secondary" variant="body2">
                  Highest Score Lead
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>
                  {featured.topScore ? featured.topScore.lead.full_name : "—"}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {featured.topScore?.lead.company_name || "—"} • Score {featured.topScore?.score_value ?? "—"}
                </Typography>
              </Box>
              <Box sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: 2 }}>
                <Typography color="text.secondary" variant="body2">
                  Most Engaged Lead
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>
                  {featured.mostEngaged ? featured.mostEngaged.lead.full_name : "—"}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {featured.mostEngaged?.lead.company_name || "—"} • Visits {featured.mostEngaged?.lead.website_visits ?? "—"}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Recent AI Recommendations</Typography>
            {overview?.recent_scores?.length ? (
              <Stack spacing={1}>
                {overview.recent_scores.slice(0, 6).map((s) => (
                  <Box
                    key={s.lead_id}
                    sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: 1.5 }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 800 }}>{s.lead_name}</Typography>
                      <ScoreChip category={s.score_category} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {s.recommended_action || "—"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No AI recommendations yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Search"
              placeholder="Lead ID, name, company, industry, email..."
              value={query}
              onChange={(e) => {
                setPage(0);
                setQuery(e.target.value);
              }}
              fullWidth
            />
            {user?.role === "Admin" ? (
              <Button variant="outlined" onClick={() => navigate("/app/leads/import")}>
                Import CSV
              </Button>
            ) : null}
          </Stack>

          <Box sx={{ height: 680, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              rowCount={total}
              paginationMode="server"
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(m) => {
                setPage(m.page);
                setPageSize(m.pageSize);
              }}
              pageSizeOptions={[50, 100, 200, 500]}
              onRowClick={(p) => navigate(`/app/leads/${encodeURIComponent(p.row.lead_id)}`)}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 3,
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "rgba(15, 23, 42, 0.02)",
                  borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                },
                "& .MuiDataGrid-row:hover": {
                  bgcolor: "rgba(37, 99, 235, 0.04)",
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}

