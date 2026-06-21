import { useEffect, useMemo, useState } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  AssignmentTurnedInOutlined,
  EmojiEventsOutlined,
  LocalFireDepartmentOutlined,
  RocketLaunchOutlined,
} from "@mui/icons-material";
import { api } from "@/api/http";
import type { SalesDashboardOverview, DashboardRecentScore } from "@/api/types";
import StatCard from "@/components/StatCard";
import ScoreChip from "@/components/ScoreChip";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PIPELINE_COLORS: Record<string, string> = {
  New: "rgba(33, 150, 243, 0.85)",
  Contacted: "rgba(255, 152, 0, 0.85)",
  Qualified: "rgba(76, 175, 80, 0.85)",
  Unqualified: "rgba(158, 158, 158, 0.6)",
  Converted: "rgba(46, 204, 113, 0.9)",
  Archived: "rgba(189, 189, 189, 0.5)",
};

const columns: GridColDef<DashboardRecentScore>[] = [
  {
    field: "lead_name",
    headerName: "Lead Name",
    flex: 1.4,
    minWidth: 160,
    renderCell: ({ row }) => (
      <Stack spacing={0}>
        <Typography sx={{ fontWeight: 900, lineHeight: 1.2 }}>{row.lead_name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {row.lead_id}
        </Typography>
      </Stack>
    ),
  },
  {
    field: "company_name",
    headerName: "Company",
    flex: 1,
    minWidth: 140,
    renderCell: ({ value }) => (
      <Typography variant="body2" color="text.secondary">
        {value ?? "—"}
      </Typography>
    ),
  },
  {
    field: "score_value",
    headerName: "Score",
    width: 90,
    renderCell: ({ value }) => (
      <Typography sx={{ fontWeight: 900, color: value >= 80 ? "error.main" : "text.primary" }}>
        {value}
      </Typography>
    ),
  },
  {
    field: "score_category",
    headerName: "Tier",
    width: 90,
    renderCell: ({ value }) => (
      <ScoreChip category={value} />
    ),
  },
  {
    field: "lead_status",
    headerName: "Pipeline Stage",
    width: 120,
    renderCell: ({ value }) => (
      <Chip
        size="small"
        label={value ?? "—"}
        sx={{
          fontWeight: 700,
          bgcolor: value ? PIPELINE_COLORS[value] ?? "rgba(99, 115, 129, 0.15)" : undefined,
          color: value && PIPELINE_COLORS[value] ? "#fff" : "text.primary",
        }}
      />
    ),
  },
  {
    field: "recommended_action",
    headerName: "Next Action",
    flex: 1.5,
    minWidth: 180,
    renderCell: ({ value }) => (
      <Typography variant="body2">
        {value ?? "—"}
      </Typography>
    ),
  },
];

export default function SalesMemberDashboard() {
  const [data, setData] = useState<SalesDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.get<SalesDashboardOverview>("/dashboard/sales-overview");
        if (mounted) setData(res.data);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const barData = useMemo(() => {
    const stages = data?.pipeline_stages ?? [];
    const labels = stages.map((s) => s.stage);
    const counts = stages.map((s) => s.count);
    return {
      labels,
      datasets: [
        {
          label: "Leads",
          data: counts,
          backgroundColor: labels.map(
            (l) => PIPELINE_COLORS[l] ?? "rgba(99, 115, 129, 0.6)"
          ),
          borderRadius: 4,
        },
      ],
    };
  }, [data?.pipeline_stages]);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Sales Command Center
        </Typography>
        <Typography color="text.secondary">
          Your personalized performance dashboard and priority queue.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* KPI Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <StatCard
          label="Total Assigned"
          value={loading ? "…" : String(data?.total_assigned ?? 0)}
          icon={<AssignmentTurnedInOutlined color="action" />}
          helper="Active workload"
        />
        <StatCard
          label="Hot Leads"
          value={loading ? "…" : String(data?.hot_count ?? 0)}
          icon={<LocalFireDepartmentOutlined sx={{ color: "error.main" }} />}
          helper="Score ≥ 80 — prioritize"
        />
        <StatCard
          label="Open Opportunities"
          value={loading ? "…" : String(data?.open_opportunities ?? 0)}
          icon={<RocketLaunchOutlined sx={{ color: "warning.main" }} />}
          helper="Active pipeline"
        />
        <StatCard
          label="Closed Won"
          value={loading ? "…" : String(data?.closed_won_count ?? 0)}
          icon={<EmojiEventsOutlined sx={{ color: "success.main" }} />}
          helper="Converted deals"
        />
      </Box>

      {/* Pipeline Summary + Priority Leads */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" },
          gap: 2,
        }}
      >
        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={0.25} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>My Pipeline</Typography>
              <Typography variant="body2" color="text.secondary">
                Leads by pipeline stage
              </Typography>
            </Stack>
            {data && data.pipeline_stages.length > 0 ? (
              <Bar
                data={barData}
                options={{
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                }}
              />
            ) : (
              <Box sx={{ py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  No leads assigned yet.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 900 }}>
                  Priority Leads
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sorted by score — hottest first
                </Typography>
              </Stack>
              {data && (
                <Chip
                  label={`${data.priority_leads.length} shown`}
                  size="small"
                  color="primary"
                />
              )}
            </Stack>
            <Box sx={{ height: 360, width: "100%" }}>
              <DataGrid
                rows={data?.priority_leads ?? []}
                columns={columns}
                getRowId={(row) => row.lead_id}
                loading={loading}
                disableRowSelectionOnClick
                hideFooter
                pageSizeOptions={[10]}
                sx={{
                  borderRadius: 1,
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "rgba(15, 23, 42, 0.04)",
                    fontWeight: 900,
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
