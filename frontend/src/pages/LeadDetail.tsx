import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/http";
import type { LeadIntelligenceDetail } from "@/api/types";
import ScoreChip from "@/components/ScoreChip";
import { useAuthStore } from "@/stores/auth";

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

  const canAdminAct = user?.role === "Admin";

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
    return () => {
      mounted = false;
    };
  }, [leadId]);

  const onAddNote = async () => {
    if (!leadId) return;
    const body = noteBody.trim();
    if (!body) return;
    setActionBusy(true);
    try {
      await api.post(`/leads/${encodeURIComponent(leadId)}/notes`, { body });
      setNoteBody("");
      const res = await api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`);
      setData(res.data);
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
      const res = await api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`);
      setData(res.data);
    } finally {
      setActionBusy(false);
    }
  };

  const onRemoveTag = async (tagId: string) => {
    if (!leadId) return;
    setActionBusy(true);
    try {
      await api.delete(`/leads/${encodeURIComponent(leadId)}/tags/${encodeURIComponent(tagId)}`);
      const res = await api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`);
      setData(res.data);
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
      const res = await api.get<LeadIntelligenceDetail>(`/leads/${encodeURIComponent(leadId)}/intelligence`);
      setData(res.data);
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

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
            Lead Intelligence
          </Typography>
          <Typography color="text.secondary">
            {leadId}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/app/leads")}>
            Back to Leads
          </Button>
          {canAdminAct ? (
            <>
              <Button
                variant="outlined"
                disabled={actionBusy || loading || !data}
                onClick={onArchiveToggle}
              >
                {data?.lead.lead_status === "Archived" ? "Unarchive" : "Archive"}
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={actionBusy || loading}
                onClick={onDelete}
              >
                Delete
              </Button>
            </>
          ) : null}
        </Stack>
      </Stack>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} alignItems="stretch">
        <Card sx={{ borderRadius: 4, flex: 1 }}>
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
                  <Typography sx={{ fontWeight: 800 }}>
                    {lead.company_size_category} • {lead.company_size_range}
                  </Typography>
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
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Upload Batch</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{data.import_batch_code || "—"}</Typography>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 900 }}>AI Intelligence</Typography>
              {data?.ai.lead_tier ? <ScoreChip category={data.ai.lead_tier} /> : null}
            </Stack>
            {loading || !data ? (
              <Typography color="text.secondary">Loading…</Typography>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Lead Score</Typography>
                  <Typography sx={{ fontWeight: 900 }}>{data.ai.score_value ?? "—"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Conversion Probability</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {typeof data.ai.conversion_probability === "number"
                      ? `${(data.ai.conversion_probability * 100).toFixed(1)}%`
                      : "—"}
                  </Typography>
                </Stack>
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
                  <Typography color="text.secondary">Ranking Position</Typography>
                  <Typography sx={{ fontWeight: 900 }}>{data.ai.ranking_position ?? "—"}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Predicted Value</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {typeof data.ai.predicted_value === "number"
                      ? data.ai.predicted_value.toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : "—"}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Assigned Rep</Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {data.assignment.assigned_to_name || data.assignment.assigned_to_staff_id || "—"}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Lead Status</Typography>
                  <Typography sx={{ fontWeight: 900 }}>{lead?.lead_status}</Typography>
                </Stack>
                {data.ai.recommended_action ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Recommendation: <b>{data.ai.recommended_action}</b>
                  </Typography>
                ) : null}
                {data.ai.reasoning ? (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {data.ai.reasoning}
                  </Typography>
                ) : null}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Lead Attributes (Raw Data)</Typography>
            {!rawOriginal && !rawMapped ? (
              <Typography color="text.secondary">No raw dataset fields captured for this lead yet.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {rawOriginal ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Original upload columns
                    </Typography>
                    <Box sx={{ maxHeight: 260, overflow: "auto", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: 1.5 }}>
                      <Stack spacing={0.75}>
                        {Object.entries(rawOriginal).map(([k, v]) => (
                          <Stack key={k} direction="row" justifyContent="space-between" spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                              {k}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                              {v == null ? "—" : String(v)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                ) : null}

                {rawMapped ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Normalized mapped fields
                    </Typography>
                    <Box sx={{ maxHeight: 260, overflow: "auto", border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: 1.5 }}>
                      <Stack spacing={0.75}>
                        {Object.entries(rawMapped).map(([k, v]) => (
                          <Stack key={k} direction="row" justifyContent="space-between" spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                              {k}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                              {v == null ? "—" : String(v)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  </Box>
                ) : null}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, flex: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Activity Timeline</Typography>
            {data?.recent_events?.length ? (
              <Stack spacing={1}>
                {data.recent_events.map((e) => (
                  <Box
                    key={e.id}
                    sx={{
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      borderRadius: 3,
                      p: 1.5,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography sx={{ fontWeight: 800 }}>{e.event_type}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(e.created_at).toLocaleString()}
                      </Typography>
                    </Stack>
                    {e.data ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {JSON.stringify(e.data)}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No activity recorded yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5}>
        <Card sx={{ borderRadius: 4, flex: 1 }}>
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
                  <Box key={n.id} sx={{ border: "1px solid rgba(15, 23, 42, 0.08)", borderRadius: 3, p: 1.5 }}>
                    <Typography sx={{ fontWeight: 800 }}>{new Date(n.created_at).toLocaleString()}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {n.body}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No notes yet.</Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4, flex: 1 }}>
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

