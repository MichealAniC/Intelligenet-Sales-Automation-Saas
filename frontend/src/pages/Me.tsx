import { useEffect, useState } from "react";
import { Alert, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { api } from "@/api/http";
import type { UserPublic } from "@/api/types";
import { useAuthStore } from "@/stores/auth";

export default function Me() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await api.get<UserPublic>("/users/me");
        if (mounted) setUser(res.data);
      } catch (err: any) {
        const detail = err?.response?.data?.detail;
        if (mounted) setError(typeof detail === "string" ? detail : "Failed to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setUser]);

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Profile
        </Typography>
        <Typography color="text.secondary">Your current authenticated account.</Typography>
      </Stack>

      {error ? <Alert severity="warning">{error}</Alert> : null}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: 3 }}>
          {loading && !user ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : !user ? (
            <Typography color="text.secondary">No user data.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  Identity
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>{user.full_name}</Typography>
                <Typography color="text.secondary">{user.email}</Typography>
              </Stack>
              <Divider />
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Role</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{user.role}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Staff ID</Typography>
                  <Typography sx={{ fontWeight: 800 }}>{user.staff_id}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Created</Typography>
                  <Typography sx={{ fontWeight: 800 }}>
                    {new Date(user.created_at).toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

