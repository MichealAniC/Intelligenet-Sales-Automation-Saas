import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import { Link, Outlet, useLocation } from "react-router-dom";

function NavLinkButton(props: { to: string; label: string }) {
  const location = useLocation();
  const active = location.pathname === props.to;

  return (
    <Button
      component={Link}
      to={props.to}
      variant="text"
      color="primary"
      sx={{
        fontWeight: 700,
        color: active ? "primary.main" : "text.secondary",
      }}
    >
      {props.label}
    </Button>
  );
}

export default function PublicLayout() {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "rgba(248, 250, 252, 0.86)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1.75 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography
                component={Link}
                to="/"
                variant="h6"
                sx={{
                  fontWeight: 900,
                  letterSpacing: -0.3,
                  color: "text.primary",
                  textDecoration: "none",
                }}
              >
                SalesPilot AI
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ display: { xs: "none", md: "flex" } }}>
                <NavLinkButton to="/" label="Home" />
                <NavLinkButton to="/about" label="About" />
                <NavLinkButton to="/services" label="Services" />
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1.25} alignItems="center">
              <Button component={Link} to="/login" variant="text" color="primary" sx={{ fontWeight: 800 }}>
                Login
              </Button>
              <Button component={Link} to="/register" variant="contained" color="secondary" sx={{ fontWeight: 800 }}>
                Get Started
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Outlet />

      <Divider />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} SalesPilot AI. All rights reserved.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Predictive lead scoring • Prescriptive automation • Routing intelligence
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button component={Link} to="/about" variant="text" color="primary">
              About
            </Button>
            <Button component={Link} to="/services" variant="text" color="primary">
              Services
            </Button>
            <Button component={Link} to="/login" variant="text" color="primary">
              Login
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

