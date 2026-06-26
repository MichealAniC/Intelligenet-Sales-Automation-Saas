import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { getTeamWorkload } from "@/api/http";
import type { TeamMemberWorkload } from "@/api/types";

export default function TeamManagement() {
  const [workload, setWorkload] = useState<TeamMemberWorkload[]>([]);
  const [workloadLoading, setWorkloadLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMemberWorkload | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadWorkload = useCallback(async () => {
    setWorkloadLoading(true);
    try {
      const res = await getTeamWorkload();
      setWorkload(res.team_workload);
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
    () => workload.map((m) => ({ id: m.user_id, ...m })),
    [workload],
  );

  // Summary stats
  const totalReps = workload.length;
  const activeReps = workload.filter((m) => m.profile_status === "Active").length;
  const totalActiveLeads = workload.reduce((s, m) => s + m.active_leads, 0);
  const totalCapacity = workload.reduce((s, m) => s + m.capacity, 0);
  const avgUtilization = totalCapacity > 0 ? Math.round((totalActiveLeads / totalCapacity) * 100) : 0;

  const metricsColumns = useMemo<GridColDef[]>(
    () => [
      { field: "full_name", headerName: "Name", minWidth: 160, flex: 1 },
      {
        field: "profile_status",
        headerName: "Profile Status",
        width: 180,
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
      {
        field: "capacity",
        headerName: "Capacity",
        width: 100,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
        ),
      },
      {
        field: "active_leads",
        headerName: "Active Leads",
        width: 120,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 800 }}>{p.value}</Typography>
        ),
      },
      {
        field: "available_capacity",
        headerName: "Available Capacity",
        width: 160,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
        ),
      },
      {
        field: "utilization",
        headerName: "Utilization %",
        width: 220,
        renderCell: (p: any) => {
          const v = (p.value as number) * 100;
          const color = v >= 100 ? "error" : v >= 80 ? "warning" : "success";
          return (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(v, 100)}
                color={color as any}
                sx={{ flex: 1, height: 8, borderRadius: 1 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 44, textAlign: "right" }}>
                {Math.round(v)}%
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "nurturing_leads",
        headerName: "Nurturing",
        width: 100,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
        ),
      },
      {
        field: "won_leads",
        headerName: "Won",
        width: 80,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
        ),
      },
      {
        field: "lost_leads",
        headerName: "Lost",
        width: 80,
        renderCell: (p: any) => (
          <Typography sx={{ fontWeight: 700 }}>{p.value}</Typography>
        ),
      },
    ],
    [],
  );

  const handleRowClick = (params: any) => {
    const member = workload.find(m => m.user_id === params.id);
    if (member) {
      setSelectedMember(member);
      setDrawerOpen(true);
    }
  };

  return (
    <>
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
                Total Active Leads
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {totalActiveLeads}
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
                  color={avgUtilization >= 100 ? "error" : avgUtilization >= 80 ? "warning" : "success"}
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
              getRowId={(row) => row.user_id}
              onRowClick={handleRowClick}
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
                  cursor: "pointer",
                },
              }}
            />
            </Box>
          </CardContent>
        </Card>
      </Stack>

      {/* Drawer for Selected Member */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedMember && (
          <Box sx={{ width: 400, p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {selectedMember.full_name}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setDrawerOpen(false)}
              >
                Close
              </Button>
            </Stack>

            <Stack spacing={2}>
              <Typography variant="subtitle1" color="text.secondary">
                Staff ID: {selectedMember.staff_id}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Profile Status: <Chip label={selectedMember.profile_status} size="small" />
              </Typography>

              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Derived Capacity
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {selectedMember.capacity}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Active Leads
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {selectedMember.active_leads}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Available Capacity
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {selectedMember.available_capacity}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Utilization: {Math.round(selectedMember.utilization * 100)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(selectedMember.utilization * 100, 100)}
                    color={
                      selectedMember.utilization >= 1
                        ? "error"
                        : selectedMember.utilization >= 0.8
                        ? "warning"
                        : "success"
                    }
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Nurturing Leads
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {selectedMember.nurturing_leads}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Closed Won
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {selectedMember.won_leads}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Closed Lost
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {selectedMember.lost_leads}
                  </Typography>
                </CardContent>
              </Card>

              {selectedMember.sales_profile && (
                <Typography variant="subtitle1" color="text.secondary">
                  Sales Profile: {selectedMember.sales_profile}
                </Typography>
              )}
              <Typography variant="subtitle1" color="text.secondary">
                Availability: {selectedMember.availability_status}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Performance Rating: {selectedMember.performance_rating}
              </Typography>
              {selectedMember.industry_specializations.length > 0 && (
                <Typography variant="subtitle1" color="text.secondary">
                  Industries: {selectedMember.industry_specializations.join(", ")}
                </Typography>
              )}
              <Typography variant="subtitle1" color="text.secondary">
                Auto Assignment: {selectedMember.auto_assignment_enabled ? "Enabled" : "Disabled"}
              </Typography>
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
}
