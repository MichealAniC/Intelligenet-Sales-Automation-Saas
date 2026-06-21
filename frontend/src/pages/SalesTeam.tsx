import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import { api } from "@/api/http";
import type {
  AvailabilityStatus,
  InvitationCreateRequest,
  InvitationCreateResponse,
  InvitationPublic,
  ProfileStatus,
  RoutingProfileUpdate,
  SalesProfile,
  TeamMemberWorkload,
} from "@/api/types";

const SALES_PROFILES: SalesProfile[] = [
  "Junior Sales Rep",
  "Senior Sales Rep",
  "Industry Specialist",
  "Top Performer",
];
const AVAILABILITY_OPTIONS: AvailabilityStatus[] = ["Available", "Busy", "On Leave", "Inactive"];
const PROFILE_STATUSES: ProfileStatus[] = ["Pending Configuration", "Active", "Disabled"];

export default function SalesTeam() {
  const [email, setEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invites, setInvites] = useState<InvitationPublic[]>([]);
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [workload, setWorkload] = useState<TeamMemberWorkload[]>([]);
  const [workloadLoading, setWorkloadLoading] = useState(true);

  // Config modal state
  const [configMember, setConfigMember] = useState<TeamMemberWorkload | null>(null);
  const [cfgProfile, setCfgProfile] = useState<SalesProfile | "">("");
  const [cfgAvailability, setCfgAvailability] = useState<AvailabilityStatus>("Available");
  const [cfgRating, setCfgRating] = useState(0);
  const [cfgSpecializations, setCfgSpecializations] = useState<string[]>([]);
  const [cfgAutoAssign, setCfgAutoAssign] = useState(false);
  const [cfgProfileStatus, setCfgProfileStatus] = useState<ProfileStatus>("Pending Configuration");
  const [cfgSaving, setCfgSaving] = useState(false);

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const load = async () => {
    const res = await api.get<InvitationPublic[]>("/invitations/me/list");
    setInvites(res.data);
  };

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
    void load();
    void loadWorkload();
  }, [loadWorkload]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLatestLink(null);
    if (!emailOk) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const payload: InvitationCreateRequest = {
        email: email.trim(),
        expires_in_hours: expiresInHours,
      };
      const res = await api.post<InvitationCreateResponse>("/invitations", payload);
      const fullUrl = new URL(res.data.invitation_url, window.location.origin).toString();
      setLatestLink(fullUrl);
      setSuccess(`Invitation created for ${res.data.invitation.email}`);
      setEmail("");
      await load();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to create invitation");
    } finally {
      setLoading(false);
    }
  };

  const copyLatest = async () => {
    if (!latestLink) return;
    try {
      await navigator.clipboard.writeText(latestLink);
      setSuccess("Invitation link copied");
    } catch {
      setSuccess(latestLink);
    }
  };

  const openConfig = (m: TeamMemberWorkload) => {
    setConfigMember(m);
    setCfgProfile(m.sales_profile ?? "");
    setCfgAvailability(m.availability_status);
    setCfgRating(m.performance_rating);
    setCfgSpecializations(m.industry_specializations ?? []);
    setCfgAutoAssign(m.auto_assignment_enabled);
    setCfgProfileStatus(m.profile_status);
  };

  const closeConfig = () => setConfigMember(null);

  const saveConfig = async () => {
    if (!configMember) return;
    setCfgSaving(true);
    try {
      const payload: RoutingProfileUpdate = {
        sales_profile: cfgProfile || null,
        availability_status: cfgAvailability,
        performance_rating: cfgRating,
        industry_specializations: cfgSpecializations,
        auto_assignment_enabled: cfgAutoAssign,
        profile_status: cfgProfileStatus,
      };
      await api.patch(`/users/${configMember.id}/routing-profile`, payload);
      setSuccess(`${configMember.full_name}'s profile updated`);
      closeConfig();
      await loadWorkload();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to save profile");
    } finally {
      setCfgSaving(false);
    }
  };

  const workloadRows = useMemo(
    () => workload.map((m) => ({ id: m.id, ...m })),
    [workload],
  );

  const rosterColumns = useMemo<GridColDef[]>(
    () => [
      { field: "full_name", headerName: "Name", minWidth: 160, flex: 1 },
      {
        field: "sales_profile",
        headerName: "Profile",
        width: 160,
        renderCell: (p: any) =>
          p.value ?? <Typography color="text.secondary">—</Typography>,
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
      {
        field: "availability_status",
        headerName: "Availability",
        width: 120,
        renderCell: (p: any) => {
          const v = p.value as string;
          const colorMap: Record<string, "success" | "warning" | "error" | "default"> = {
            Available: "success",
            Busy: "warning",
            "On Leave": "error",
            Inactive: "default",
          };
          return <Chip label={v} color={colorMap[v] ?? "default"} size="small" variant="outlined" />;
        },
      },
      {
        field: "auto_assignment_enabled",
        headerName: "Auto-Assign",
        width: 110,
        renderCell: (p: any) => (
          <Chip
            label={p.value ? "Enabled" : "Disabled"}
            color={p.value ? "success" : "default"}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (p: any) => (
          <Tooltip title="Configure Profile">
            <IconButton
              size="small"
              color="primary"
              onClick={() => openConfig(p.row as TeamMemberWorkload)}
            >
              <SettingsOutlined fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [],
  );

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
          Sales Team
        </Typography>
        <Typography color="text.secondary">
          Manage your sales roster, configure routing profiles, and invite new members.
        </Typography>
      </Stack>

      {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
      {success ? <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert> : null}

      {/* Sales Roster */}
      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Sales Roster</Typography>
          <Box sx={{ height: 420, width: "100%", overflowX: "auto" }}>
            <DataGrid
              rows={workloadRows}
              columns={rosterColumns}
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

      {/* Invitations Section */}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Create invitation
            </Typography>
            <Box component="form" onSubmit={submit}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="stretch">
                <TextField
                  label="Sales member email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Expiry (hours)"
                  type="number"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  inputProps={{ min: 1, max: 720 }}
                  sx={{ width: { xs: "100%", md: 200 } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="secondary"
                  disabled={loading}
                  sx={{ minWidth: { xs: "100%", md: 200 } }}
                >
                  {loading ? "Creating..." : "Create link"}
                </Button>
              </Stack>
            </Box>

            {latestLink ? (
              <Stack spacing={1}>
                <Divider />
                <Typography variant="body2" color="text.secondary">
                  Invitation link
                </Typography>
                <Typography sx={{ fontWeight: 700, wordBreak: "break-all" }}>{latestLink}</Typography>
                <Button onClick={copyLatest} variant="outlined" color="secondary">
                  Copy link
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Recent invitations
          </Typography>
          <Stack spacing={1}>
            {invites.length === 0 ? (
              <Typography color="text.secondary">No invitations yet.</Typography>
            ) : (
              invites.map((inv) => (
                <Box
                  key={inv.id}
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.25,
                    borderRadius: 1,
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    bgcolor: "background.paper",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 750 }}>{inv.email}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Expires: {new Date(inv.expires_at).toLocaleString()}
                      {inv.accepted_at ? ` • Accepted: ${new Date(inv.accepted_at).toLocaleString()}` : ""}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {inv.accepted_at ? "Used" : "Pending"}
                  </Typography>
                </Box>
              ))
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Configure Profile Modal */}
      <Dialog open={!!configMember} onClose={closeConfig} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Configure Routing Profile{configMember ? ` — ${configMember.full_name}` : ""}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Profile Status</InputLabel>
              <Select
                value={cfgProfileStatus}
                label="Profile Status"
                onChange={(e) => setCfgProfileStatus(e.target.value as ProfileStatus)}
              >
                {PROFILE_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Sales Profile</InputLabel>
              <Select
                value={cfgProfile}
                label="Sales Profile"
                onChange={(e) => setCfgProfile(e.target.value as SalesProfile | "")}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {SALES_PROFILES.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Availability</InputLabel>
              <Select
                value={cfgAvailability}
                label="Availability"
                onChange={(e) => setCfgAvailability(e.target.value as AvailabilityStatus)}
              >
                {AVAILABILITY_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>
                Performance Rating: {cfgRating}
              </Typography>
              <Slider
                value={cfgRating}
                onChange={(_, v) => setCfgRating(v as number)}
                min={0}
                max={100}
                step={1}
                valueLabelDisplay="auto"
                marks={[
                  { value: 0, label: "0" },
                  { value: 50, label: "50" },
                  { value: 100, label: "100" },
                ]}
              />
            </Box>

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={cfgSpecializations}
              onChange={(_, v) => setCfgSpecializations(v as string[])}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Industry Specializations"
                  placeholder="Type and press Enter"
                />
              )}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={cfgAutoAssign}
                  onChange={(e) => setCfgAutoAssign(e.target.checked)}
                />
              }
              label="Auto-Assignment Enabled"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeConfig} variant="outlined">
            Cancel
          </Button>
          <Button onClick={saveConfig} variant="contained" disabled={cfgSaving}>
            {cfgSaving ? "Saving..." : "Save Profile"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
