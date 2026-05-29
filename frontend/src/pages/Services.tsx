import { Box, Button, Card, CardContent, Chip, Container, Divider, Stack, Typography } from "@mui/material";
import {
  AutoAwesomeOutlined,
  BoltOutlined,
  HubOutlined,
  InsightsOutlined,
  RuleOutlined,
  SecurityOutlined,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

function ServiceCard(props: {
  icon: ReactNode;
  title: string;
  description: string;
  bullets: string[];
  accent?: "primary" | "secondary" | "warning";
}) {
  const borderColor =
    props.accent === "warning"
      ? "rgba(245, 158, 11, 0.40)"
      : props.accent === "secondary"
        ? "rgba(37, 99, 235, 0.25)"
        : "rgba(15, 23, 42, 0.08)";

  return (
    <Card sx={{ borderRadius: 4, height: "100%", border: `1px solid ${borderColor}` }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.25}>
          <Box sx={{ color: props.accent === "warning" ? "warning.main" : "secondary.main" }}>
            {props.icon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {props.title}
          </Typography>
          <Typography color="text.secondary">{props.description}</Typography>
          <Stack spacing={0.5}>
            {props.bullets.map((b) => (
              <Typography key={b} variant="body2" color="text.secondary">
                • {b}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Services() {
  return (
    <>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary">
            Services
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.12 }}>
            Everything you need to run an intelligent sales workflow.
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 860 }}>
            SalesPilot AI provides predictive scoring and prescriptive automation packaged into a calm enterprise UI.
            Use it as a lead control center today, and expand into pipeline + routing rules as your team scales.
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: 4,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <ServiceCard
            accent="secondary"
            icon={<InsightsOutlined />}
            title="Predictive Lead Scoring"
            description="Score conversion probability and translate it into business-ready tiers."
            bullets={["Probability + score (0–100)", "Hot/Warm/Cold categorization", "Model artifacts loaded server-side"]}
          />
          <ServiceCard
            accent="warning"
            icon={<AutoAwesomeOutlined />}
            title="Prescriptive Automation"
            description="Convert scores into next-best actions so reps execute the same playbook."
            bullets={["Recommended follow-up actions", "Priority levels by tier", "Consistent operational guidance"]}
          />
          <ServiceCard
            accent="primary"
            icon={<HubOutlined />}
            title="AI Routing Engine"
            description="Assign leads to the right people with clarity and governance."
            bullets={["Auto-assignment (Sales reps)", "Admin oversight and role controls", "Designed for routing rules expansion"]}
          />
          <ServiceCard
            accent="primary"
            icon={<BoltOutlined />}
            title="Pipeline Analytics"
            description="Executive-grade dashboards that focus attention instead of generating noise."
            bullets={["Lead mix and trends", "Source distribution", "Revenue insights and forecasting-ready KPIs"]}
          />
          <ServiceCard
            accent="secondary"
            icon={<RuleOutlined />}
            title="Routing Rules (Planned)"
            description="Define assignment rules by segment, industry, tier, or workload."
            bullets={["Rules + overrides", "Segmented routing", "Audit-friendly configuration"]}
          />
          <ServiceCard
            accent="primary"
            icon={<SecurityOutlined />}
            title="Security & Access"
            description="Enterprise-friendly access patterns for predictable operations."
            bullets={["JWT authentication", "Role-based access (Admin/Sales)", "Clear separation of concerns"]}
          />
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Divider sx={{ mb: 4 }} />
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                gap: 4,
                alignItems: "center",
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
                  Ready to see SalesPilot AI in action?
                </Typography>
                <Typography color="text.secondary">
                  Create an account, log in, and score your first lead. The dashboard will immediately reflect your
                  scored activity and AI insights.
                </Typography>
                <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
                  <Button component={Link} to="/register" variant="contained" color="secondary" size="large">
                    Get Started
                  </Button>
                  <Button component={Link} to="/login" variant="outlined" color="primary" size="large">
                    Login
                  </Button>
                </Stack>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  Includes
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip label="Lead intake" sx={{ bgcolor: "rgba(15, 23, 42, 0.06)" }} />
                  <Chip label="AI scoring" sx={{ bgcolor: "rgba(37, 99, 235, 0.10)" }} />
                  <Chip label="Recommendations" sx={{ bgcolor: "rgba(245, 158, 11, 0.12)" }} />
                  <Chip label="Admin leads table" sx={{ bgcolor: "rgba(15, 23, 42, 0.06)" }} />
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}

