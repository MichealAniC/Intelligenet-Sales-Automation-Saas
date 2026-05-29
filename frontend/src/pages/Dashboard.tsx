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
import { Alert, Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { AutoAwesomeOutlined, InsightsOutlined, LocalFireDepartmentOutlined, TrendingUpOutlined } from "@mui/icons-material";
import { api } from "@/api/http";
import type { DashboardOverview } from "@/api/types";
import StatCard from "@/components/StatCard";
import ScoreChip from "@/components/ScoreChip";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      Hot: data?.hot_count ?? 0,
      Warm: data?.warm_count ?? 0,
      Cold: data?.cold_count ?? 0,
    } as Record<"Hot" | "Warm" | "Cold", number>;
  }, [data]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.get<DashboardOverview>("/dashboard/overview");
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
    const labels: Array<"Hot" | "Warm" | "Cold"> = ["Hot", "Warm", "Cold"];
    return {
      labels,
      datasets: [
        {
          label: "Leads",
          data: labels.map((l) => counts[l]),
          backgroundColor: ["rgba(245, 158, 11, 0.9)", "rgba(245, 158, 11, 0.55)", "rgba(15, 23, 42, 0.20)"],
          borderRadius: 10,
        },
      ],
    };
  }, [counts]);

  const doughnutData = useMemo(() => {
    const labels: Array<"Hot" | "Warm" | "Cold"> = ["Hot", "Warm", "Cold"];
    return {
      labels,
      datasets: [
        {
          data: labels.map((l) => counts[l]),
          backgroundColor: ["rgba(245, 158, 11, 0.9)", "rgba(245, 158, 11, 0.55)", "rgba(15, 23, 42, 0.20)"],
          borderWidth: 0,
        },
      ],
    };
  }, [counts]);

  const topInsights = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = [];
    if (counts.Hot > 0) {
      items.push({
        title: `${counts.Hot} hot leads require immediate follow-up`,
        detail: "Prioritize outreach and assign senior reps to maximize conversion probability.",
      });
    } else {
      items.push({
        title: "No hot leads in recent activity",
        detail: "Create and score new leads to surface priority opportunities.",
      });
    }
    if ((data?.scored_leads ?? 0) >= 3) {
      items.push({
        title: "Conversion probability signals are trending",
        detail: "Your recent scoring activity is building a clearer pipeline picture.",
      });
    }
    items.push({
      title: "Prescriptive actions are generated per lead",
      detail: "Hot → senior sales • Warm → standard follow-up • Cold → nurture campaigns",
    });
    return items.slice(0, 3);
  }, [counts.Hot, data?.scored_leads]);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          An intelligent sales control center based on live pipeline data.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <StatCard
          label="Total leads"
          value={loading ? "…" : String(data?.total_leads ?? 0)}
          icon={<TrendingUpOutlined color="action" />}
          helper="Workspace"
        />
        <StatCard
          label="Hot leads"
          value={loading ? "…" : String(counts.Hot)}
          icon={<LocalFireDepartmentOutlined sx={{ color: "warning.main" }} />}
          helper="Requires immediate follow-up"
        />
        <StatCard
          label="Warm leads"
          value={loading ? "…" : String(counts.Warm)}
          icon={<InsightsOutlined color="action" />}
          helper="Standard follow-up"
        />
        <StatCard
          label="Cold leads"
          value={loading ? "…" : String(counts.Cold)}
          icon={<InsightsOutlined color="action" />}
          helper="Nurture workflow"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "7fr 5fr" },
          gap: 2,
        }}
      >
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack spacing={0.25}>
                  <Typography sx={{ fontWeight: 900 }}>Lead Category Distribution</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Hot / Warm / Cold
                  </Typography>
                </Stack>
              </Stack>
              <Bar data={barData} />
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 4, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Stack spacing={0.25}>
                  <Typography sx={{ fontWeight: 900 }}>Mix</Typography>
                  <Typography variant="body2" color="text.secondary">
                    High-level distribution
                  </Typography>
                </Stack>
              </Stack>
              <Doughnut data={doughnutData} />
            </CardContent>
          </Card>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "5fr 7fr" },
          gap: 2,
        }}
      >
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <AutoAwesomeOutlined sx={{ color: "warning.main" }} />
              <Typography sx={{ fontWeight: 900 }}>AI Insights</Typography>
            </Stack>
            <Stack spacing={1.25}>
              {topInsights.map((i) => (
                <Box key={i.title}>
                  <Typography sx={{ fontWeight: 800 }}>{i.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {i.detail}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 900 }}>Recent Scores</Typography>
              <Typography variant="body2" color="text.secondary">
                {loading ? "…" : `${data?.scored_leads ?? 0} total`}
              </Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />

            {!data || data.recent_scores.length === 0 ? (
              <Typography color="text.secondary">No scores yet.</Typography>
            ) : (
              <Stack spacing={1.25}>
                {data.recent_scores.map((e) => (
                  <Stack
                    key={`${e.lead_id}-${e.created_at}`}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      bgcolor: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    <Stack spacing={0}>
                      <Typography sx={{ fontWeight: 900 }}>{e.lead_id}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.lead_name}
                        {e.company_name ? ` • ${e.company_name}` : ""}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <ScoreChip category={e.score_category} />
                      <Typography sx={{ fontWeight: 900 }}>{e.score_value}</Typography>
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
