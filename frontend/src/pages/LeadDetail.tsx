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
  PushPin,
  PushPinOutlined,
  RocketLaunchOutlined,
  TrendingUpOutlined,
  AccessTimeOutlined,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { api, getLeadActivities, createActivity, updateLead } from "@/api/http";
import type { LeadIntelligenceDetail, LeadStatus, ActivityType, ActivityOutcome, LeadLifecycleState, ActivityPublic } from "@/api/types";
import ScoreChip from "@/components/ScoreChip";
import { useAuthStore } from "@/stores/auth";
import { useFocus } from "@/contexts/FocusContext";

const PIPELINE_STAGES: LeadStatus[] = ["New", "Contacted", "Qualified", "Unqualified", "Converted", "Archived"];

const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: React.ReactNode }[] = [
  { value: "Call", label: "Call", icon: <CallOutlined sx={{ fontSize: 18 }} /> },
  { value: "Email", label: "Email", icon: <EmailOutlined sx={{ fontSize: 18 }} /> },
  { value: "Meeting", label: "Meeting", icon: <EventOutlined sx={{ fontSize: 18 }} /> },
  { value: "Note", label: "Note", icon: <NoteOutlined sx={{ fontSize: 18 }} /> },
];

const ACTIVITY_OUTCOMES: { value: ActivityOutcome; label: string }[] = [
  { value: "Left Message", label: "Left Message" },
  { value: "Connected", label: "Connected" },
  { value: "No Answer", label: "No Answer" },
  { value: "Completed", label: "Completed" },
  { value: "Scheduled", label: "Scheduled" },
];

const LIFECYCLE_OPTIONS: { value: LeadLifecycleState; label: string; color?: string }[] = [
  { value: "ACTIVE", label: "Active", color: "success" },
  { value: "NURTURING", label: "Nurturing", color: "warning" },
  { value: "CLOSED_WON", label: "Closed Won", color: "success" },
  { value: "CLOSED_LOST", label: "Closed Lost", color: "error" },
];

const EVENT_ICONS: Record<string, React.ReactNode> = {
  activity_call: <CallOutlined sx={{ fontSize: 16 }} />,
  activity_email: <EmailOutlined sx={{ fontSize: 16 }} />,
  activity_meeting: <EventOutlined sx={{ fontSize: 16 }} />,
  activity_note: <NoteOutlined sx={{ fontSize: 16 }} />,
  Call: <CallOutlined sx={{ fontSize: 16 }} />,
  Email: <EmailOutlined sx={{ fontSize: 16 }} />,
  Meeting: <EventOutlined sx={{ fontSize: 16 }} />,
  Note: <NoteOutlined sx={{ fontSize: 16 }} />,
};

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { pinnedLeads, pinLead, unpinLead } = useFocus();

  const [data, setData] = useState<LeadIntelligenceDetail | null>(null);
  const [activities, setActivities] = useState<ActivityPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [tagName, setTagName] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  // Activity logging state
  const [activityType, setActivityType] = useState<ActivityType>("Call");
  const [activityOutcome, setActivityOutcome] = useState<ActivityOutcome>("Connected");
  const [activityNotes, setActivityNotes] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);
  // Lifecycle state
  const [selectedState, setSelectedState] = useState<LeadLifecycleState | null>(null);
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

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
    const [intelligenceRes, activitiesRes] = await Promise.all([
      api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`),
      getLeadActivities(leadId),
    ]);
    setData(intelligenceRes.data);
    setActivities(activitiesRes);
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        await refresh();
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load lead intelligence");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [refresh]);

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

  const onLifecycleChange = async () => {
    if (!leadId || !selectedState) return;
    setActionBusy(true);
    try {
      const payload: any = {
        lifecycle_state: selectedState,
      };
      if (selectedState === "NURTURING" && nextFollowUpDate) {
        // Ensure we convert to proper ISO string for Pydantic
        payload.next_followup_date = `${nextFollowUpDate}:00.000Z`;
      }
      console.log("Sending payload:", payload);
      await updateLead(leadId, payload);
      // Reset state variables
      setSelectedState(null);
      setShowDatePicker(false);
      setNextFollowUpDate("");
      await refresh();
    } catch (err: any) {
      console.error("FULL API ERROR:", err.response?.data);
      const errorMsg = err.response?.data?.detail || err.message;
      alert(`Error: ${JSON.stringify(errorMsg)}`);
      setError(errorMsg || "Failed to update lifecycle state");
    } finally {
      setActionBusy(false);
    }
  };

  const onLogActivity = async () => {
    if (!leadId) return;
    setActivityBusy(true);
    try {
      await createActivity(leadId, {
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
  const isPinned = lead ? pinnedLeads.some((l) => l.lead_id === lead.lead_id) : false;

  // Combined timeline of activities and events
  const combinedTimeline = useMemo(() => {
    const events = data?.recent_events?.map(e => ({
      ...e,
      type: "event" as const,
    })) || [];
    const acts = activities.map(a => ({
      ...a,
      type: "activity" as const,
    }));
    
    const all = [...events, ...acts];
    all.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
    
    return all;
  }, [data?.recent_events, activities]);

  return (
    <Stack spacing={2.5}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
            Lead Command Center
          </Typography>
          <Typography color="text.secondary">{leadId}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant={isPinned ? "contained" : "outlined"}
            color={isPinned ? "primary" : "inherit"}
            startIcon={isPinned ? <PushPin /> : <PushPinOutlined />}
            onClick={() => {
              if (lead) {
                if (isPinned) {
                  unpinLead(lead.lead_id);
                } else {
                  pinLead(lead);
                }
              }
            }}
          >
            {isPinned ? "Unpin" : "Pin"}
          </Button>
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

      {/* Lifecycle State */}
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <RocketLaunchOutlined sx={{ color: "primary.main" }} />
            <Typography sx={{ fontWeight: 900 }}>Lifecycle State</Typography>
            <Typography variant="body2" color="text.secondary">
              — Current: <b>{lead?.lifecycle_state ?? "—"}</b>
            </Typography>
          </Stack>
          <Stack direction="column" spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {LIFECYCLE_OPTIONS.map((option) => {
                const isCurrent = lead?.lifecycle_state === option.value;
                const isSelected = selectedState === option.value;
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "contained" : isCurrent ? "contained" : "outlined"}
                    color={option.color as any}
                    disabled={actionBusy || loading}
                    onClick={() => {
                      setSelectedState(option.value);
                      if (option.value === "NURTURING") {
                        setShowDatePicker(true);
                      } else {
                        setShowDatePicker(false);
                        setNextFollowUpDate("");
                      }
                    }}
                    sx={{ borderRadius: 1, minWidth: 130 }}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </Stack>
            {showDatePicker && (
              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Next Follow-Up Date"
                  type="datetime-local"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="contained"
                  disabled={actionBusy || !nextFollowUpDate || selectedState !== "NURTURING"}
                  onClick={onLifecycleChange}
                >
                  Set State
                </Button>
              </Stack>
            )}
            {selectedState && !showDatePicker && selectedState !== lead?.lifecycle_state && (
              <Button
                variant="contained"
                disabled={actionBusy}
                onClick={onLifecycleChange}
              >
                Update State
              </Button>
            )}
            {lead?.next_followup_date && (
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeOutlined color="action" />
                <Typography variant="body2" color="text.secondary">
                  Next follow-up: {new Date(lead.next_followup_date).toLocaleString()}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

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
                onChange={(e) => setActivityOutcome(e.target.value as ActivityOutcome)}
                size="small"
              >
                {ACTIVITY_OUTCOMES.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
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
                {combinedTimeline.length} events
              </Typography>
            </Stack>
            {combinedTimeline.length ? (
              <Stack spacing={1}>
                {combinedTimeline.map((item) => {
                  if (item.type === "event") {
                    const e = item;
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
                  } else {
                    const a = item;
                    return (
                      <Box
                        key={a.activity_id}
                        sx={{
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          borderRadius: 1,
                          p: 1.5,
                          bgcolor: "rgba(37, 99, 235, 0.02)",
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            {EVENT_ICONS[a.activity_type] ?? null}
                            <Typography sx={{ fontWeight: 800 }}>{a.activity_type}</Typography>
                            <Chip
                              size="small"
                              label={a.outcome}
                              color={
                                a.outcome === "Connected" || a.outcome === "Completed" ? "success" :
                                a.outcome === "No Answer" ? "default" : "warning"
                              }
                              sx={{ fontWeight: 700 }}
                            />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(a.created_at).toLocaleString()}
                          </Typography>
                        </Stack>
                        {a.notes ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {a.notes}
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  }
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
