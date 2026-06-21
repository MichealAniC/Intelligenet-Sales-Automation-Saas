import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AutoAwesomeOutlined,
  CallOutlined,
  EmailOutlined,
  EventOutlined,
  NoteOutlined,
  RocketLaunchOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/http";
import type { LeadIntelligenceDetail, LeadStatus } from "@/api/types";
import ScoreChip from "@/components/ScoreChip";
import { useAuthStore } from "@/stores/auth";

const PIPELINE_STAGES: LeadStatus[] = ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Archived"];

const ACTIVITY_TYPES = [
  { value: "Call", label: "Call", icon: <CallOutlined sx={{ fontSize: 18 }} /> },
  { value: "Email", label: "Email", icon: <EmailOutlined sx={{ fontSize: 18 }} /> },
  { value: "Meeting", label: "Meeting", icon: <EventOutlined sx={{ fontSize: 18 }} /> },
  { value: "Note", label: "Note", icon: <NoteOutlined sx={{ fontSize: 18 }} /> },
];

const ACTIVITY_OUTCOMES = ["Positive", "Neutral", "Negative", "No Response"];

const EVENT_ICONS: Record<string, React.ReactNode> = {
  activity_call: <CallOutlined sx={{ fontSize: 16 }} />,
  activity_email: <EmailOutlined sx={{ fontSize: 16 }} />,
  activity_meeting: <EventOutlined sx={{ fontSize: 16 }} />,
  activity_note: <NoteOutlined sx={{ fontSize: 16 }} />,
};

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<LeadIntelligenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [tagName, setTagName] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  // Activity logging state
  const [activityType, setActivityType] = useState("Call");
  const [activityOutcome, setActivityOutcome] = useState("Positive");
  const [activityNotes, setActivityNotes] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);

  const canAdminAct = user?.role === "Admin";
  const isSales = user?.role === "Sales";

  const rawOriginal = useMemo(() => {
    const raw = data?.raw_data as any;
    const original = raw?.original;
    return original && typeof original === "object" ? (original as Record<string, unknown>) : null;
  }, [data]);

  const rawMapped = useMemo(() => {
    const raw = data?.raw_data as any;
    const mapped = raw?.mapped;
    return mapped && typeof mapped === "object" ? (mapped as Record<string, unknown>) : null;
  }, [data]);

  const refresh = useCallback(async () => {
    if (!leadId) return;
    const res = await api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`);
    setData(res.data);
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`);
        if (mounted) setData(res.data);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load lead intelligence");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [leadId]);

  const onStatusChange = async (newStatus: string) => {
    if (!leadId) return;
    setActionBusy(true);
    try {
      await api.patch(`/leads/${encodeURIComponent(leadId)}/status`, { lead_status: newStatus });
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update status");
    } finally {
      setActionBusy(false);
    }
  };

  const onLogActivity = async () => {
    if (!leadId) return;
    setActivityBusy(true);
    try {
      await api.post(`/leads/${encodeURIComponent(leadId)}/activities`, {
        activity_type: activityType,
        outcome: activityOutcome,
        notes: activityNotes.trim() || null,
      });
      setActivityNotes("");
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to log activity");
    } finally {
      setActivityBusy(false);
    }
  };

  const onAddNote = async () => {
    if (!leadId) return;
    const body = noteBody.trim();
    if (!body) return;
    setActionBusy(true);
    try {
      await api.post(`/leads/${encodeURIComponent(leadId)}/notes`, { body });
      setNoteBody("");
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const onAddTag = async () => {
    if (!leadId) return;
    const name = tagName.trim();
    if (!name) return;
    setActionBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      await api.post(`/leads/${encodeURIComponent(leadId)}/tags`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTagName("");
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const onRemoveTag = async (tagId: string) => {
    if (!leadId) return;
    setActionBusy(true);
    try {
      await api.delete(`/leads/${encodeURIComponent(leadId)}/tags/${encodeURIComponent(tagId)}`);
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const onArchiveToggle = async () => {
    if (!leadId || !data) return;
    setActionBusy(true);
    try {
      if (data.lead.lead_status === "Archived") {
        await api.post(`/leads/${encodeURIComponent(leadId)}/unarchive`);
      } else {
        await api.post(`/leads/${encodeURIComponent(leadId)}/archive`);
      }
      await refresh();
    } finally {
      setActionBusy(false);
    }
  };

  const onDelete = async () => {
    if (!leadId) return;
    setActionBusy(true);
    try {
      await api.delete(`/leads/${encodeURIComponent(leadId)}`);
      navigate("/app/leads");
    } finally {
      setActionBusy(false);
    }
  };

  const lead = data?.lead;
  const currentStatusIdx = lead ? PIPELINE_STAGES.indexOf(lead.lead_status) : -1;

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
            Lead Intelligence
          </Typography>
          <Typography color="text.secondary">{leadId}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/app/leads")}>
            Back to Leads
          </Button>
          {canAdminAct ? (
            <>
              <Button variant="outlined" disabled={actionBusy || loading || !data} onClick={onArchiveToggle}>
                {data?.lead.lead_status === "Archived" ? "Unarchive" : "Archive"}
              </Button>
              <Button variant="contained" color="error" disabled={actionBusy || loading} onClick={onDelete}>
                Delete
              </Button>
            </>
          ) : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="warning" onClose={() => setError(null)}>{error}</Alert> : null}

      {/* Pipeline Stepper */}
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <RocketLaunchOutlined sx={{ color: "primary.main" }} />
            <Typography sx={{ fontWeight: 900 }}>Pipeline Progression</Typography>
            <Typography variant="body2" color="text.secondary">
              — Current: <b>{lead?.lead_status ?? "—"}</b>
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCurrent = lead?.lead_status === stage;
              const isPast = currentStatusIdx > idx;
              return (
                <Button
                  key={stage}
                  variant={isCurrent ? "contained" : isPast ? "outlined" : "text"}
                  color={isCurrent ? "primary" : isPast ? "success" : "inherit"}
                  disabled={actionBusy || loading || isCurrent || stage === "Archived"}
                  onClick={() => onStatusChange(stage)}
                  sx={{ borderRadius: 1, minWidth: 110 }}
                >
                  {stage}
                </Button>
              );
            })}
          </Stack>
        </CardContent>
      </Card>

      {/* Lead Overview + AI Intelligence */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="stretch">
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Lead Overview</Typography>
            {loading || !lead ? (
              <Typography color="text.secondary">Loading…</Typography>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Lead ID</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.lead_id}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Full Name</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.full_name}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Company</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.company_name}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Industry</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.company_industry}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Company Size</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.company_size_category} • {lead.company_size_range}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Lead Source</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.lead_source}</Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Contact</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.email}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Phone</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{lead.phone_number}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Created</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{new Date(lead.created_at).toLocaleString()}</Typography>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* AI Intelligence Panel */}
        <Card sx={{ borderRadius: 1, flex: 1, border: "2px solid rgba(245, 158, 11, 0.2)" }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <AutoAwesomeOutlined sx={{ color: "warning.main" }} />
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>AI Intelligence</Typography>
              {data?.ai.lead_tier ? <ScoreChip category={data.ai.lead_tier} /> : null}
            </Stack>
            {loading || !data ? (
              <Typography color="text.secondary">Loading…</Typography>
            ) : (
              <Stack spacing={1.5}>
                {/* Score Display */}
                <Box
                  sx={{
                    textAlign: "center",
                    py: 2,
                    borderRadius: 1,
                    bgcolor: (data.ai.score_value ?? 0) >= 80
                      ? "rgba(244, 67, 54, 0.06)"
                      : (data.ai.score_value ?? 0) >= 50
                        ? "rgba(255, 152, 0, 0.06)"
                        : "rgba(15, 23, 42, 0.03)",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">AI Lead Score</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: "2.5rem", lineHeight: 1.1 }}>
                    {data.ai.score_value ?? "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {typeof data.ai.conversion_probability === "number"
                      ? `${(data.ai.conversion_probability * 100).toFixed(1)}% conversion probability`
                      : ""}
                  </Typography>
                </Box>

                {/* Recommended Actions */}
                {data.ai.recommended_action ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                    }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                      <TrendingUpOutlined sx={{ fontSize: 18, color: "warning.main" }} />
                      <Typography sx={{ fontWeight: 900, fontSize: "0.85rem" }}>Recommended Action</Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 700 }}>{data.ai.recommended_action}</Typography>
                  </Box>
                ) : null}

                {data.ai.reasoning ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {data.ai.reasoning}
                  </Typography>
                ) : null}

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">AI Priority</Typography>
                  <Typography sx={{ fontWeight: 900 }}>{data.ai.ai_priority_level || "—"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Confidence</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {typeof data.ai.confidence_score === "number"
                      ? `${(data.ai.confidence_score * 100).toFixed(1)}%`
                      : "—"}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Assigned Rep</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {data.assignment.assigned_to_name || data.assignment.assigned_to_staff_id || "—"}
                  </Typography>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Activity Logging + Timeline */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        {/* Log Activity */}
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <EventOutlined sx={{ color: "primary.main" }} />
              <Typography sx={{ fontWeight: 900 }}>Log Activity</Typography>
            </Stack>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                {ACTIVITY_TYPES.map((t) => (
                  <Button
                    key={t.value}
                    variant={activityType === t.value ? "contained" : "outlined"}
                    size="small"
                    startIcon={t.icon}
                    onClick={() => setActivityType(t.value)}
                    sx={{ borderRadius: 1, flex: 1 }}
                  >
                    {t.label}
                  </Button>
                ))}
              </Stack>
              <Select
                value={activityOutcome}
                onChange={(e) => setActivityOutcome(e.target.value)}
                size="small"
              >
                {ACTIVITY_OUTCOMES.map((o) => (
                  <MenuItem key={o} value={o}>{o}</MenuItem>
                ))}
              </Select>
              <TextField
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                placeholder="Notes / outcome details…"
                fullWidth
                multiline
                minRows={2}
                size="small"
              />
              <Button
                variant="contained"
                disabled={activityBusy}
                onClick={onLogActivity}
                sx={{ borderRadius: 1 }}
              >
                {activityBusy ? "Logging…" : "Log Activity"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Audit Timeline */}
        <Card sx={{ borderRadius: 1, flex: 1.5 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>Activity Timeline</Typography>
              <Typography variant="body2" color="text.secondary">
                {data?.recent_events?.length ?? 0} events
              </Typography>
            </Stack>
            {data?.recent_events?.length ? (
              <Stack spacing={1}>
                {data.recent_events.map((e) => {
                  const evtData = e.data as any;
                  const isActivity = e.event_type.startsWith("activity_");
                  return (
                    <Box
                      key={e.id}
                      sx={{
                        border: "1px solid rgba(15, 23, 42, 0.08)",
                        borderRadius: 1,
                        p: 1.5,
                        bgcolor: isActivity ? "rgba(37, 99, 235, 0.02)" : undefined,
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          {EVENT_ICONS[e.event_type] ?? null}
                          <Typography sx={{ fontWeight: 800 }}>
                            {isActivity ? evtData?.activity_type ?? e.event_type : e.event_type.replace(/_/g, " ")}
                          </Typography>
                          {evtData?.outcome && (
                            <Chip
                              size="small"
                              label={evtData.outcome}
                              color={
                                evtData.outcome === "Positive" ? "success" :
                                evtData.outcome === "Negative" ? "error" : "default"
                              }
                              sx={{ fontWeight: 700 }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(e.created_at).toLocaleString()}
                        </Typography>
                      </Stack>
                      {evtData?.notes ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {evtData.notes}
                        </Typography>
                      ) : e.data && !isActivity ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {typeof e.data === "object"
                            ? Object.entries(e.data).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : JSON.stringify(e.data)}
                        </Typography>
                      ) : null}
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography color="text.secondary">No activity recorded yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Notes + Tags */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Notes</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Add an operational note for this lead…"
                fullWidth
                multiline
                minRows={2}
              />
              <Button variant="contained" disabled={actionBusy || !noteBody.trim()} onClick={onAddNote}>
                Add
              </Button>
            </Stack>
            {data?.notes?.length ? (
              <Stack spacing={1}>
                {data.notes.map((n) => (
                  <Box key={n.id} sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 1, p: 1.5 }}>
                    <Typography sx={{ fontWeight: 800 }}>{new Date(n.created_at).toLocaleString()}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{n.body}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No notes yet.</Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 1, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Tags</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="Add tag (e.g., Enterprise, Event-Lead)…"
                fullWidth
              />
              <Button variant="contained" disabled={!canAdminAct || actionBusy || !tagName.trim()} onClick={onAddTag}>
                Add
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {data?.tags?.length ? (
                data.tags.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.name}
                    onDelete={canAdminAct ? () => onRemoveTag(t.id) : undefined}
                    sx={{ mb: 1 }}
                  />
                ))
              ) : (
                <Typography color="text.secondary">No tags yet.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}
