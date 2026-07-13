import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  LinearProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  AssignmentTurnedInOutlined,
  EmojiEventsOutlined,
  LocalFireDepartmentOutlined,
  AccessTimeOutlined,
  SentimentDissatisfiedOutlined,
  SentimentSatisfiedOutlined,
  TrendingUpOutlined,
  PushPin,
} from "@mui/icons-material";
import { getMyWorkload, getSalesOverview } from "@/api/http";
import type { WorkloadDashboard, SalesDashboardOverview, DashboardRecentScore, LeadPublic } from "@/api/types";
import StatCard from "@/components/StatCard";
import ScoreChip from "@/components/ScoreChip";
import { useFocus } from "@/contexts/FocusContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function SalesMemberDashboard() {
  const [workload, setWorkload] = useState<WorkloadDashboard | null>(null);
  const [salesOverview, setSalesOverview] = useState<SalesDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pinnedLeads, setFocusedLead } = useFocus();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [workloadData, salesData] = await Promise.all([
          getMyWorkload(),
          getSalesOverview(),
        ]);
        if (mounted) {
          setWorkload(workloadData);
          setSalesOverview(salesData);
        }
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

  const utilizationPercent = workload ? Math.round(workload.utilization * 100) : 0;

  const pipelineChartData = useMemo(() => {
    if (!salesOverview) return null;
    return {
      labels: salesOverview.pipeline_stages.map((s) => s.stage),
      datasets: [
        {
          label: "Leads",
          data: salesOverview.pipeline_stages.map((s) => s.count),
          backgroundColor: "rgba(37, 99, 235, 0.8)",
          borderRadius: 2,
        },
      ],
    };
  }, [salesOverview]);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Sales Command Center
        </Typography>
        <Typography color="text.secondary">
          Your personalized workload and performance dashboard.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {/* Main KPI Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <StatCard
          label="Total Assigned"
          value={loading ? "…" : String(salesOverview?.total_assigned ?? 0)}
          icon={<TrendingUpOutlined color="action" />}
          helper="Total leads assigned"
        />
        <StatCard
          label="Hot Leads"
          value={loading ? "…" : String(salesOverview?.hot_count ?? 0)}
          icon={<LocalFireDepartmentOutlined sx={{ color: "error.main" }} />}
          helper="Priority leads to close"
        />
        <StatCard
          label="Open Opportunities"
          value={loading ? "…" : String(salesOverview?.open_opportunities ?? 0)}
          icon={<SentimentSatisfiedOutlined sx={{ color: "success.main" }} />}
          helper="Active pipeline"
        />
        <StatCard
          label="Closed Won"
          value={loading ? "…" : String(salesOverview?.closed_won_count ?? 0)}
          icon={<EmojiEventsOutlined sx={{ color: "success.main" }} />}
          helper="Successful conversions"
        />
      </Box>

      {/* Workload Section */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
        }}
      >
        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={0.25} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>Workload Utilization</Typography>
              <Typography variant="body2" color="text.secondary">
                Current active lead utilization
              </Typography>
            </Stack>
            <Stack spacing={1}>
              <LinearProgress
                variant="determinate"
                value={utilizationPercent}
                sx={{
                  height: 12,
                  borderRadius: 6,
                  bgcolor: "rgba(99, 115, 129, 0.15)",
                  "& .MuiLinearProgress-bar": {
                    bgcolor: utilizationPercent >= 90 ? "error.main" : utilizationPercent >= 70 ? "warning.main" : "success.main",
                  },
                }}
              />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {loading ? "…" : `${workload?.active_leads} / ${workload?.capacity} leads`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {loading ? "…" : `${utilizationPercent}%`}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={0.25} sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>Workload Breakdown</Typography>
              <Typography variant="body2" color="text.secondary">
                Lead lifecycle distribution
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <StatCard
                label="Active"
                value={loading ? "…" : String(workload?.active_leads ?? 0)}
                icon={<LocalFireDepartmentOutlined sx={{ color: "error.main" }} />}
                helper="Currently working"
              />
              <StatCard
                label="Nurturing"
                value={loading ? "…" : String(workload?.nurturing_leads ?? 0)}
                icon={<AccessTimeOutlined color="action" />}
                helper="On hold"
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Pinned Leads Widget */}
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <PushPin sx={{ color: "primary.main" }} />
            <Typography sx={{ fontWeight: 900 }}>Pinned Leads</Typography>
          </Stack>
          {pinnedLeads.length > 0 ? (
            <List>
              {pinnedLeads.map((lead) => (
                <ListItemButton
                  key={lead.lead_id}
                  onClick={() => setFocusedLead(lead)}
                  sx={{
                    borderRadius: 1,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    mb: 1,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PushPin fontSize="small" sx={{ color: "primary.main" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${lead.first_name} ${lead.last_name}`}
                    secondary={lead.company_name}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No pinned leads yet. Pin leads to keep them at the top of your dashboard!
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Chart and Priority Leads */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
        }}
      >
        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 900 }}>Pipeline Stages</Typography>
                <Typography variant="body2" color="text.secondary">
                  Lead status distribution
                </Typography>
              </Stack>
            </Stack>
            {pipelineChartData && <Bar data={pipelineChartData} />}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 900 }}>Priority Leads</Typography>
              <Typography variant="body2" color="text.secondary">
                Highest score first
              </Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            {!salesOverview || salesOverview.priority_leads.length === 0 ? (
              <Typography color="text.secondary">No priority leads yet.</Typography>
            ) : (
              <Stack spacing={1.25}>
                {salesOverview.priority_leads.map((lead: DashboardRecentScore) => (
                  <Stack
                    key={`${lead.lead_id}-${lead.created_at}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      bgcolor: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    <Stack spacing={0}>
                      <Typography sx={{ fontWeight: 900 }}>{lead.lead_id}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {lead.lead_name}
                        {lead.company_name ? ` • ${lead.company_name}` : ""}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <ScoreChip category={lead.score_category} />
                      <Typography sx={{ fontWeight: 900 }}>{lead.score_value}</Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
