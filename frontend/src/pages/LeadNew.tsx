import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { AutoAwesomeOutlined } from "@mui/icons-material";
import { api } from "@/api/http";
import type {
  CompanySizeCategory,
  EstimatedBudget,
  FollowUpStatus,
  LeadCreate,
  LeadSource,
  LeadWorkflowResponse,
  PurchaseTimeline,
  SeniorityLevel,
} from "@/api/types";
import { useScoreHistoryStore } from "@/stores/scoreHistory";
import ScoreChip from "@/components/ScoreChip";

const seniorityLevels: SeniorityLevel[] = ["C-Suite", "VP", "Director", "Manager", "Staff"];
const companySizeCategories: CompanySizeCategory[] = ["Startup", "SMB", "Mid-Market", "Enterprise"];
const leadSources: LeadSource[] = [
  "LinkedIn",
  "Webinar",
  "Referral",
  "Cold Email",
  "Website",
  "Paid Ads",
  "Events",
];
const followUpStatuses: FollowUpStatus[] = ["Positive", "Neutral", "Negative", "No Response"];
const estimatedBudgets: EstimatedBudget[] = ["Low", "Medium", "High"];
const purchaseTimelines: PurchaseTimeline[] = ["Immediate", "1-3 Months", "3-6 Months", "Future"];

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function FormGrid(props: { columns: any; children: ReactNode }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: props.columns, gap: 2 }}>
      {props.children}
    </Box>
  );
}

export default function LeadNew() {
  const addScoreEvent = useScoreHistoryStore((s) => s.add);

  const [form, setForm] = useState<LeadCreate>({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    job_title: "",
    seniority_level: "Staff",
    department: "",
    country: "Nigeria",
    company_name: "",
    company_industry: "",
    company_size_category: "SMB",
    company_size_range: "1-50",
    estimated_annual_revenue: 1,
    lead_source: "Website",
    date_captured: todayISO(),
    website_visits: 0,
    pages_viewed: 0,
    average_time_on_site: 0,
    email_open_rate: 0,
    email_click_rate: 0,
    webinar_attendance: false,
    last_interaction_days: 0,
    meeting_scheduled: false,
    follow_up_status: "No Response",
    estimated_budget: "Low",
    purchase_timeline: "Future",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadWorkflowResponse | null>(null);

  const update = (key: keyof LeadCreate, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<LeadWorkflowResponse>("/leads", form);
      setResult(res.data);
      addScoreEvent({
        lead_id: res.data.lead.lead_id,
        lead_name: `${res.data.lead.first_name} ${res.data.lead.last_name}`,
        company_name: res.data.lead.company_name,
        score_category: res.data.score.score_category,
        score_value: res.data.score.score_value,
        prediction_probability: res.data.score.prediction_probability,
        recommended_action: res.data.recommended_action,
        created_at: res.data.score.created_at,
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  const scoreLabel = useMemo(() => {
    if (!result) return null;
    return `${result.score.score_value} • ${(result.score.prediction_probability * 100).toFixed(1)}%`;
  }, [result]);

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Lead Intake
        </Typography>
        <Typography color="text.secondary">
          Create a lead, score it with the model, and receive a prescriptive recommendation.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "7fr 5fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={submit}>
              <Stack spacing={3}>
                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 900 }}>Contact</Typography>
                  <FormGrid columns={{ xs: "1fr", md: "1fr 1fr" }}>
                    <TextField
                      label="First name"
                      value={form.first_name}
                      onChange={(e) => update("first_name", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Last name"
                      value={form.last_name}
                      onChange={(e) => update("last_name", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Phone number"
                      value={form.phone_number}
                      onChange={(e) => update("phone_number", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Job title"
                      value={form.job_title}
                      onChange={(e) => update("job_title", e.target.value)}
                      required
                      fullWidth
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel id="seniority">Seniority</InputLabel>
                      <Select
                        labelId="seniority"
                        label="Seniority"
                        value={form.seniority_level}
                        onChange={(e) => update("seniority_level", e.target.value as SeniorityLevel)}
                      >
                        {seniorityLevels.map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Department"
                      value={form.department}
                      onChange={(e) => update("department", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Country"
                      value={form.country}
                      onChange={(e) => update("country", e.target.value)}
                      required
                      fullWidth
                    />
                  </FormGrid>
                </Stack>

                <Divider />

                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 900 }}>Company</Typography>
                  <FormGrid columns={{ xs: "1fr", md: "1fr 1fr" }}>
                    <TextField
                      label="Company name"
                      value={form.company_name}
                      onChange={(e) => update("company_name", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Industry"
                      value={form.company_industry}
                      onChange={(e) => update("company_industry", e.target.value)}
                      required
                      fullWidth
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel id="company-size">Company size category</InputLabel>
                      <Select
                        labelId="company-size"
                        label="Company size category"
                        value={form.company_size_category}
                        onChange={(e) => update("company_size_category", e.target.value as CompanySizeCategory)}
                      >
                        {companySizeCategories.map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Company size range"
                      value={form.company_size_range}
                      onChange={(e) => update("company_size_range", e.target.value)}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Estimated annual revenue (Millions)"
                      type="number"
                      value={form.estimated_annual_revenue}
                      onChange={(e) => update("estimated_annual_revenue", Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.1 }}
                      required
                      fullWidth
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel id="lead-source">Lead source</InputLabel>
                      <Select
                        labelId="lead-source"
                        label="Lead source"
                        value={form.lead_source}
                        onChange={(e) => update("lead_source", e.target.value as LeadSource)}
                      >
                        {leadSources.map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Date captured"
                      type="date"
                      value={form.date_captured}
                      onChange={(e) => update("date_captured", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      required
                      fullWidth
                    />
                  </FormGrid>
                </Stack>

                <Divider />

                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 900 }}>Engagement</Typography>
                  <FormGrid columns={{ xs: "1fr", md: "1fr 1fr" }}>
                    <TextField
                      label="Website visits"
                      type="number"
                      value={form.website_visits}
                      onChange={(e) => update("website_visits", Number(e.target.value))}
                      inputProps={{ min: 0, step: 1 }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Pages viewed"
                      type="number"
                      value={form.pages_viewed}
                      onChange={(e) => update("pages_viewed", Number(e.target.value))}
                      inputProps={{ min: 0, step: 1 }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Avg time on site (mins)"
                      type="number"
                      value={form.average_time_on_site}
                      onChange={(e) => update("average_time_on_site", Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.1 }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Last interaction (days)"
                      type="number"
                      value={form.last_interaction_days}
                      onChange={(e) => update("last_interaction_days", Number(e.target.value))}
                      inputProps={{ min: 0, step: 1 }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Email open rate (%)"
                      type="number"
                      value={form.email_open_rate}
                      onChange={(e) => update("email_open_rate", Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.1 }}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Email click rate (%)"
                      type="number"
                      value={form.email_click_rate}
                      onChange={(e) => update("email_click_rate", Number(e.target.value))}
                      inputProps={{ min: 0, step: 0.1 }}
                      required
                      fullWidth
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel id="followup">Follow-up status</InputLabel>
                      <Select
                        labelId="followup"
                        label="Follow-up status"
                        value={form.follow_up_status}
                        onChange={(e) => update("follow_up_status", e.target.value as FollowUpStatus)}
                      >
                        {followUpStatuses.map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.webinar_attendance}
                          onChange={(e) => update("webinar_attendance", e.target.checked)}
                        />
                      }
                      label="Webinar attendance"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.meeting_scheduled}
                          onChange={(e) => update("meeting_scheduled", e.target.checked)}
                        />
                      }
                      label="Meeting scheduled"
                    />
                  </FormGrid>
                </Stack>

                <Divider />

                <Stack spacing={1}>
                  <Typography sx={{ fontWeight: 900 }}>Intent</Typography>
                  <FormGrid columns={{ xs: "1fr", md: "1fr 1fr" }}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="budget">Estimated budget</InputLabel>
                      <Select
                        labelId="budget"
                        label="Estimated budget"
                        value={form.estimated_budget}
                        onChange={(e) => update("estimated_budget", e.target.value as EstimatedBudget)}
                      >
                        {estimatedBudgets.map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel id="timeline">Purchase timeline</InputLabel>
                      <Select
                        labelId="timeline"
                        label="Purchase timeline"
                        value={form.purchase_timeline}
                        onChange={(e) => update("purchase_timeline", e.target.value as PurchaseTimeline)}
                      >
                        {purchaseTimelines.map((v) => (
                          <MenuItem key={v} value={v}>
                            {v}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </FormGrid>
                </Stack>

                <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    size="large"
                    disabled={loading}
                  >
                    {loading ? "Scoring..." : "Create & Score Lead"}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoAwesomeOutlined sx={{ color: "warning.main" }} />
                <Typography sx={{ fontWeight: 900 }}>AI Result</Typography>
              </Stack>
              {!result ? (
                <Typography color="text.secondary">
                  Submit a lead to generate a score, tier, and recommended action.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack spacing={0}>
                      <Typography variant="body2" color="text.secondary">
                        Lead
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>{result.lead.lead_id}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {result.lead.first_name} {result.lead.last_name} • {result.lead.company_name}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.75} alignItems="flex-end">
                      <ScoreChip category={result.score.score_category} label={result.score.score_category} />
                      <Typography sx={{ fontWeight: 900 }}>{scoreLabel}</Typography>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Recommended Action
                    </Typography>
                    <Typography sx={{ fontWeight: 900 }}>{result.recommended_action}</Typography>
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Model
                    </Typography>
                    <Typography>{result.score.model_name}</Typography>
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      Assignment
                    </Typography>
                    {result.assignment ? (
                      <Stack spacing={0.25}>
                        <Typography sx={{ fontWeight: 900 }}>
                          Priority: {result.assignment.assignment_priority}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status: {result.assignment.assignment_status}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">No assignee available</Typography>
                    )}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
