import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useAuthStore } from "@/stores/auth";

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          My Profile
        </Typography>
        <Typography color="text.secondary">
          View your profile details and performance metrics.
        </Typography>
      </Stack>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: "2rem" }}>
              {user?.full_name?.charAt(0) ?? "U"}
            </Avatar>
            <Stack spacing={1} flex={1}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {user?.full_name ?? "User"}
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                <Chip label={user?.role ?? "Sales"} size="small" color="primary" />
                <Typography color="text.secondary">{user?.email ?? ""}</Typography>
                <Typography color="text.secondary">Staff ID: {user?.staff_id ?? ""}</Typography>
              </Stack>
              <Typography color="text.secondary" variant="body2">
                Assigned Territory: North America
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>My Performance</Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              <Card sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main" }}>14</Typography>
                  <Typography color="text.secondary">Leads Closed</Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "success.main" }}>22%</Typography>
                  <Typography color="text.secondary">Conversion Rate</Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 1, border: "1px solid", borderColor: "divider" }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: "secondary.main" }}>$450k</Typography>
                  <Typography color="text.secondary">Pipeline Value</Typography>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
