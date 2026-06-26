import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getAnalyticsOverview } from "@/api/http";
import type { AnalyticsOverview } from "@/api/types";
import StatCard from "@/components/StatCard";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const result = await getAnalyticsOverview();
        if (mounted) setData(result);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const tierChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.leads_by_tier).map(([name, value]) => ({ name, value }));
  }, [data]);

  const sourceChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.leads_by_source).map(([name, value]) => ({ name, value }));
  }, [data]);

  const statusChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.leads_by_status).map(([name, value]) => ({ name, value }));
  }, [data]);

  const totalActiveLeads = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.leads_by_tier).reduce((sum, val) => sum + val, 0);
  }, [data]);

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
          Analytics Dashboard
        </Typography>
        <Typography color="text.secondary">
          Visualize your sales pipeline and performance metrics.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: 2,
        }}
      >
        <StatCard
          label="Total Pipeline Value"
          value={`₦${Number(data?.total_pipeline_value || 0).toLocaleString()}`}
          helper="Total estimated annual revenue of active leads"
        />
        <StatCard
          label="Total Active Leads"
          value={String(totalActiveLeads)}
          helper="Number of leads in the pipeline"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" },
          gap: 2,
        }}
      >
        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>Leads by Tier</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tierChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>Leads by Source</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Leads by Status</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}
