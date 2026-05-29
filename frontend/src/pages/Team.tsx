import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "@/api/http";
import type { InvitationCreateRequest, InvitationCreateResponse, InvitationPublic } from "@/api/types";

export default function Team() {
  const [email, setEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invites, setInvites] = useState<InvitationPublic[]>([]);
  const [latestLink, setLatestLink] = useState<string | null>(null);

  const emailOk = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const load = async () => {
    const res = await api.get<InvitationPublic[]>("/invitations/me/list");
    setInvites(res.data);
  };

  useEffect(() => {
    void load();
  }, []);

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

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
          Team & Invitations
        </Typography>
        <Typography color="text.secondary">
          Invite Sales members to your organization. Invitations expire and can be used only once.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

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
                    borderRadius: 2,
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
    </Stack>
  );
}

