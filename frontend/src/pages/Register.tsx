import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import type { AdminSignupRequest, TokenResponse } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

const ADM_REGEX = /^ADM-\d{3}$/;

export default function Register() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const [form, setForm] = useState<AdminSignupRequest>({
    organization_name: "",
    staff_id: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSelfRegister = useMemo(() => !token, [token]);
  const staffIdOk = useMemo(() => ADM_REGEX.test(form.staff_id.trim()), [form.staff_id]);

  useEffect(() => {
    if (token) {
      return;
    }
  }, [token]);

  const update = (key: keyof AdminSignupRequest, value: any) =>
    setForm((p) => ({ ...p, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!staffIdOk) {
        setError("Admin Staff ID must match ADM-XXX (e.g., ADM-001)");
        return;
      }
      if (!canSelfRegister) {
        setError("You’re already signed in. Logout to create a new organization.");
        return;
      }
      const res = await api.post<TokenResponse>("/auth/signup-admin", form);
      setAuth(res.data);
      navigate("/app/dashboard", { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.4 }}>
          Create your workspace
        </Typography>
        <Typography color="text.secondary">
          Admin signup creates a new organization in SalesPilot AI. Sales members join via invitation.
        </Typography>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <TextField
            label="Company / Organization Name"
            value={form.organization_name}
            onChange={(e) => update("organization_name", e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Full Name"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Admin Staff ID"
            value={form.staff_id}
            onChange={(e) => update("staff_id", e.target.value)}
            required
            fullWidth
            error={form.staff_id.length > 0 && !staffIdOk}
            helperText="Format: ADM-XXX (e.g., ADM-001)"
          />
          <TextField
            label="Work Email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create workspace"}
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

      <Alert severity="info" sx={{ bgcolor: "rgba(37, 99, 235, 0.08)" }}>
        Sales members cannot sign up publicly. Ask your Admin for an invitation link.
      </Alert>
    </Stack>
  );
}
