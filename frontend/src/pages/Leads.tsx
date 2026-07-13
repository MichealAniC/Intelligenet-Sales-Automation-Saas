import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, type GridSortModel } from "@mui/x-data-grid";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/api/http";
import type {
  AutoAssignmentResponse,
  DashboardOverview,
  LeadOpsListResponse,
  LeadSummaryItem,
  LeadLifecycleState,
} from "@/api/types";
import ScoreChip from "@/components/ScoreChip";
import { useAuthStore } from "@/stores/auth";

// Helper for tier priority sorting
const tierPriority: Record<string, number> = {
  "Hot": 3,
  "Warm": 2,
  "Cold": 1,
};

export default function Leads() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL search params
  const [items, setItems] = useState<LeadSummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get("pageSize") || "50"));
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "0"));
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>(searchParams.get("tier") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "");
  const [lifecycleFilter, setLifecycleFilter] = useState<LeadLifecycleState | "">(searchParams.get("lifecycle") as LeadLifecycleState || "");

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (query) params.set("q", query); else params.delete("q");
    if (page > 0) params.set("page", page.toString()); else params.delete("page");
    if (pageSize !== 50) params.set("pageSize", pageSize.toString()); else params.delete("pageSize");
    if (tierFilter) params.set("tier", tierFilter); else params.delete("tier");
    if (statusFilter) params.set("status", statusFilter); else params.delete("status");
    if (lifecycleFilter) params.set("lifecycle", lifecycleFilter); else params.delete("lifecycle");
    setSearchParams(params, { replace: true });
  }, [query, page, pageSize, tierFilter, statusFilter, lifecycleFilter, searchParams, setSearchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [opsRes, overviewRes] = await Promise.all([
          api.get<LeadOpsListResponse>(
            `/leads/ops?limit=${pageSize}&offset=${page * pageSize}&q=${encodeURIComponent(query)}${tierFilter ? `&tier=${tierFilter}` : ""}${statusFilter ? `&lead_status=${statusFilter}` : ""}`
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
  }, [page, pageSize, query, tierFilter, statusFilter]);

  const isAdmin = user?.role === "Admin";

  const runAutoAssignment = async () => {
    setAutoAssigning(true);
    setAutoAssignResult(null);
    try {
      const res = await api.post<AutoAssignmentResponse>("/leads/trigger-auto-assignment", null, {
        timeout: 300_000,
      });
      const d = res.data;
      setAutoAssignResult(
        `Auto-assignment complete: ${d.assigned} assigned, ${d.failed} skipped out of ${d.total_unassigned} unassigned leads.`
      );
      // Refresh lead list
      const opsRes = await api.get<LeadOpsListResponse>(
        `/leads/ops?limit=${pageSize}&offset=${page * pageSize}&q=${encodeURIComponent(query)}`
      );
      setItems(opsRes.data.items);
      setTotal(opsRes.data.total);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setAutoAssignResult(typeof detail === "string" ? detail : "Auto-assignment failed");
    } finally {
      setAutoAssigning(false);
    }
  };

  // Sort items first by score desc, then tier priority desc
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const scoreA = a.score_value ?? -1;
      const scoreB = b.score_value ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;

      const tierA = tierPriority[a.score_category ?? ""] ?? 0;
      const tierB = tierPriority[b.score_category ?? ""] ?? 0;
      return tierB - tierA;
    });
  }, [items]);

  // Filter by lifecycle state if needed
  const filteredItems = useMemo(() => {
    if (!lifecycleFilter) return sortedItems;
    return sortedItems.filter((item) => item.lead.lifecycle_state === lifecycleFilter);
  }, [sortedItems, lifecycleFilter]);

  const rows = useMemo(() => {
    return filteredItems.map((i) => ({
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
  }, [filteredItems]);

  const featured = useMemo(() => {
    const withScore = filteredItems.filter((i) => typeof i.score_value === "number") as Array<
      LeadSummaryItem & { score_value: number }
    >;
    const topScore = [...withScore].sort((a, b) => (b.score_value ?? 0) - (a.score_value ?? 0))[0] || null;
    const mostEngaged =
      [...filteredItems].sort((a, b) => {
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
  }, [filteredItems]);

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
        field: "lifecycle_state",
        headerName: "Lifecycle",
        width: 140,
        sortable: true,
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
          {isAdmin ? "Lead Operations Center" : "My Leads"}
        </Typography>
        <Typography color="text.secondary">
          {isAdmin
            ? "Manage, prioritize, and inspect lead intelligence across your workspace."
            : "View and track leads assigned to you."}
        </Typography>
      </Stack>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography color="text.secondary" variant="body2">
              Total Leads
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {overview?.total_leads ?? "—"}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ borderRadius: 1, flex: 1 }}>
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
        <Card sx={{ borderRadius: 1, flex: 1 }}>
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
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Featured Leads</Typography>
            <Stack spacing={1.5}>
              <Box sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 1, p: 2 }}>
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
              <Box sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 1, p: 2 }}>
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

        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Recent AI Recommendations</Typography>
            {overview?.recent_scores?.length ? (
              <Stack spacing={1}>
                {overview.recent_scores.slice(0, 6).map((s) => (
                  <Box
                    key={s.lead_id}
                    sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 1, p: 1.5 }}
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

      <Card sx={{ borderRadius: 1 }}>
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
            <Select
              value={tierFilter}
              displayEmpty
              onChange={(e) => { setPage(0); setTierFilter(e.target.value); }}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">All Tiers</MenuItem>
              <MenuItem value="Hot">Hot</MenuItem>
              <MenuItem value="Warm">Warm</MenuItem>
              <MenuItem value="Cold">Cold</MenuItem>
            </Select>
            <Select
              value={statusFilter}
              displayEmpty
              onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All Stages</MenuItem>
              <MenuItem value="New">New</MenuItem>
              <MenuItem value="Contacted">Contacted</MenuItem>
              <MenuItem value="Qualified">Qualified</MenuItem>
              <MenuItem value="Unqualified">Unqualified</MenuItem>
              <MenuItem value="Converted">Converted</MenuItem>
              <MenuItem value="Archived">Archived</MenuItem>
            </Select>
            <Select
              value={lifecycleFilter}
              displayEmpty
              onChange={(e) => { setPage(0); setLifecycleFilter(e.target.value as any); }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All Lifecycles</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="NURTURING">Nurturing</MenuItem>
              <MenuItem value="CLOSED_WON">Closed Won</MenuItem>
              <MenuItem value="CLOSED_LOST">Closed Lost</MenuItem>
            </Select>
            {isAdmin ? (
              <>
                <Button variant="outlined" onClick={() => navigate("/app/leads/import")}>
                  Import CSV
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={autoAssigning}
                  onClick={runAutoAssignment}
                >
                  {autoAssigning ? "Assigning..." : "Run Auto-Assignment"}
                </Button>
              </>
            ) : null}
          </Stack>

          <Box sx={{ height: 680, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              rowCount={lifecycleFilter ? rows.length : total}
              paginationMode={lifecycleFilter ? "client" : "server"}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(m) => {
                setPage(m.page);
                setPageSize(m.pageSize);
              }}
              pageSizeOptions={[50, 100, 200, 500]}
              onRowClick={(p) => navigate(`/app/leads/${encodeURIComponent(p.row.lead_id)}`)}
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

      <Snackbar
        open={!!autoAssignResult}
        autoHideDuration={8000}
        onClose={() => setAutoAssignResult(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAutoAssignResult(null)}
          severity={autoAssignResult?.includes("failed") ? "error" : "success"}
          variant="filled"
        >
          {autoAssignResult}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
