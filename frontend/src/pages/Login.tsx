import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Link as MuiLink,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "@/api/http";
import type { LoginRequest, TokenResponse, UserRole } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

const ADM_RE = /^ADM-\d{3}$/;
const ST_RE = /^ST-\d{3}$/;

export default function Login() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();
  const location = useLocation() as any;

  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Admin");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffIdOk = useMemo(() => {
    const trimmed = staffId.trim();
    if (!trimmed) return true; // let required validation handle empty
    return role === "Admin" ? ADM_RE.test(trimmed) : ST_RE.test(trimmed);
  }, [staffId, role]);

  const redirectTo = useMemo(() => {
    const from = location?.state?.from;
    return typeof from === "string" && from.length ? from : "/app/dashboard";
  }, [location?.state?.from]);

  useEffect(() => {
    if (token) navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffIdOk) {
      setError(
        role === "Admin"
          ? "Admin Staff ID must match ADM-XXX (e.g. ADM-001)"
          : "Sales Staff ID must match ST-XXX (e.g. ST-001)",
      );
      return;
    }

    setLoading(true);
    try {
      const payload: LoginRequest = { staff_id: staffId.trim(), password, role };
      const res = await api.post<TokenResponse>("/auth/login", payload);
      setAuth(res.data);
      if (!remember) {
        localStorage.removeItem("isa_access_token");
        localStorage.removeItem("isa_user");
      }
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
          Welcome back
        </Typography>
        <Typography color="text.secondary">
          Sign in to access your AI-powered sales workspace.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Role</FormLabel>
            <RadioGroup
              row
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <FormControlLabel value="Admin" control={<Radio />} label="Admin" />
              <FormControlLabel value="Sales" control={<Radio />} label="Sales Member" />
            </RadioGroup>
          </FormControl>

          <TextField
            label="Staff ID"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            autoComplete="username"
            required
            fullWidth
            error={staffId.trim().length > 0 && !staffIdOk}
            helperText={
              role === "Admin"
                ? "Format: ADM-XXX (e.g. ADM-001)"
                : "Format: ST-XXX (e.g. ST-001)"
            }
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            fullWidth
          />

          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
              }
              label="Remember me"
            />
            <MuiLink component="button" type="button" sx={{ fontWeight: 600 }}>
              Forgot password
            </MuiLink>
          </Stack>

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1.25}>
        <Alert severity="info" sx={{ bgcolor: "rgba(37, 99, 235, 0.08)" }}>
          Admins create a workspace from the signup page. Sales members join only via invitation.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          New here?{" "}
          <MuiLink component={Link} to="/register" sx={{ fontWeight: 700 }}>
            Create workspace
          </MuiLink>
        </Typography>
      </Stack>
    </Stack>
  );
}
