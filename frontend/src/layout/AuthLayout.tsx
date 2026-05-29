import { Box, Container, Paper, Stack, Typography } from "@mui/material";
import type { PropsWithChildren } from "react";

export default function AuthLayout(props: PropsWithChildren) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 0.9fr" },
      }}
    >
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          bgcolor: "#0F172A",
          color: "white",
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            SalesPilot AI
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Smarter Sales Decisions.
            <br />
            Automated.
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.75)", maxWidth: 520 }}>
            Predictive lead scoring, prescriptive routing, and a calm control center for sales teams
            that want consistency, speed, and measurable outcomes.
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)" }}>
            Built for executives and sales operations
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)" }}>
            Secure authentication • Role-based access • Model-backed scoring
          </Typography>
        </Stack>
      </Box>

      <Container maxWidth="sm" sx={{ display: "flex", alignItems: "center", py: 6 }}>
        <Paper
          sx={{
            width: "100%",
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            border: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          {props.children}
        </Paper>
      </Container>
    </Box>
  );
}

