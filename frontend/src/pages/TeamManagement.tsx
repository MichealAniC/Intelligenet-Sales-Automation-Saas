import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { api } from "@/api/http";
import type { TeamMemberWorkload } from "@/api/types";

export default function TeamManagement() {
  const [workload, setWorkload] = useState<TeamMemberWorkload[]>([]);
  const [workloadLoading, setWorkloadLoading] = useState(true);

  const loadWorkload = useCallback(async () => {
    setWorkloadLoading(true);
    try {
      const res = await api.get<TeamMemberWorkload[]>("/users/team-workload");
      setWorkload(res.data);
    } catch {
      // silently fail
    } finally {
      setWorkloadLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkload();
  }, [loadWorkload]);

  const workloadRows = useMemo(
    () => workload.map((m) => ({ id: m.id, ...m })),
    [workload],
  );

  // Summary stats
  const totalReps = workload.length;
  const activeReps = workload.filter((m) => m.profile_status === "Active").length;
  const totalAssigned = workload.reduce((s, m) => s + m.assigned_leads, 0);
  const totalCapacity = workload.reduce((s, m) => s + m.capacity, 0);
  const avgUtilization = totalCapacity > 0
    ? Math.round((totalAssigned / totalCapacity) * 100)
    : 0;

  const metricsColumns = useMemo<GridColDef[]>(
    () => [
      { field: "full_name", headerName: "Name", minWidth: 160, flex: 1 },
      {
        field: "performance_rating",
        headerName: "Rating",
        width: 100,
        renderCell: (p: any) => {
          const v = p.value as number;
          const color = v >= 80 ? "success" : v >= 50 ? "warning" : "error";
          return (
            <Chip
              label={v}
              color={color as any}
              size="small"
              sx={{ fontWeight: 800, minWidth: 40 }}
            />
          );
        },
      },
      {
        field: "assigned_leads",
        headerName: "Assigned",
        width: 100,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 800 }}>{p.value}</Typography>
        ),
      },
      {
        field: "capacity",
        headerName: "Capacity",
        width: 100,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
        ),
      },
      {
        field: "utilization_percent",
        headerName: "Utilization",
        width: 220,
        renderCell: (p: any) => {
          const v = p.value as number;
          const color = v >= 90 ? "error" : v >= 70 ? "warning" : "success";
          return (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(v, 100)}
                color={color as any}
                sx={{ flex: 1, height: 8, borderRadius: 1 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 44, textAlign: "right" }}>
                {v}%
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "profile_status",
        headerName: "Status",
        width: 160,
        renderCell: (p: any) => {
          const v = p.value as string;
          const colorMap: Record<string, "warning" | "success" | "error"> = {
            "Pending Configuration": "warning",
            Active: "success",
            Disabled: "error",
          };
          return <Chip label={v} color={colorMap[v] ?? "default"} size="small" />;
        },
      },
    ],
    [],
  );

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
          Team Management
        </Typography>
        <Typography color="text.secondary">
          Monitor workload distribution, capacity utilization, and team performance metrics.
        </Typography>
      </Stack>

      {/* Summary Cards */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography color="text.secondary" variant="body2">
              Total Reps
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {totalReps}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeReps} active
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography color="text.secondary" variant="body2">
              Total Assigned
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {totalAssigned}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              of {totalCapacity} capacity
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography color="text.secondary" variant="body2">
              Avg Utilization
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {avgUtilization}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(avgUtilization, 100)}
                color={avgUtilization >= 90 ? "error" : avgUtilization >= 70 ? "warning" : "success"}
                sx={{ flex: 1, height: 8, borderRadius: 1 }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Metrics Table */}
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Workload Metrics</Typography>
          <Box sx={{ height: 480, width: "100%", overflowX: "auto" }}>
            <DataGrid
              rows={workloadRows}
              columns={metricsColumns}
              loading={workloadLoading}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              sx={{
                border: "1px solid rgba(15, 23, 42, 0.08)",
                borderRadius: 1,
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
