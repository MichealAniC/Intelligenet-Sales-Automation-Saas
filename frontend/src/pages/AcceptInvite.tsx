import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Divider,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "@/api/http";
import type { InvitationAcceptRequest, InvitationInfo, TokenResponse } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

const ST_REGEX = /^ST-\d{3}$/;

export default function AcceptInvite() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const { token: inviteToken } = useParams();
  const navigate = useNavigate();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffIdOk = useMemo(() => ST_REGEX.test(staffId.trim()), [staffId]);

  useEffect(() => {
    if (!inviteToken) {
      setError("Missing invitation token");
      return;
    }
    if (token) {
      navigate("/app/dashboard", { replace: true });
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<InvitationInfo>(`/invitations/${inviteToken}`);
        if (mounted) setInfo(res.data);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Invalid invitation");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [inviteToken, navigate, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inviteToken) {
      setError("Missing invitation token");
      return;
    }
    if (!staffIdOk) {
      setError("Sales Staff ID must match ST-XXX (e.g., ST-001)");
      return;
    }
    setLoading(true);
    try {
      const payload: InvitationAcceptRequest = {
        token: inviteToken,
        full_name: fullName,
        password,
        staff_id: staffId,
      };
      const res = await api.post<TokenResponse>("/invitations/accept", payload);
      setAuth(res.data);
      navigate("/app/dashboard", { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Invitation acceptance failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
          Join your team
        </Typography>
        <Typography color="text.secondary">
          {info
            ? `You’ve been invited to join ${info.organization_name} as a Sales member.`
            : "Validating your invitation..."}
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {info ? (
        <Alert severity="info" sx={{ bgcolor: "rgba(37, 99, 235, 0.08)" }}>
          Invitation email: {info.email}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <TextField
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            fullWidth
            disabled={!info}
          />
          <TextField
            label="Sales Staff ID"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            required
            fullWidth
            disabled={!info}
            error={staffId.length > 0 && !staffIdOk}
            helperText="Format: ST-XXX (e.g., ST-001)"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            disabled={!info}
          />

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={loading || !info}
          >
            {loading ? "Joining..." : "Join workspace"}
          </Button>
        </Stack>
      </Box>

      <Divider />

      <Typography variant="body2" color="text.secondary">
        Already have an account?{" "}
        <MuiLink component={Link} to="/login" sx={{ fontWeight: 700 }}>
          Login
        </MuiLink>
      </Typography>
    </Stack>
  );
}
