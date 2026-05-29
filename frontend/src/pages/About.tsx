import { Box, Card, CardContent, Chip, Container, Divider, Stack, Typography } from "@mui/material";
import { AutoAwesomeOutlined, ShieldOutlined, TrendingUpOutlined } from "@mui/icons-material";
import type { ReactNode } from "react";

function SectionTitle(props: { overline: string; title: string; description: string }) {
  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary">
        {props.overline}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.12 }}>
        {props.title}
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 820 }}>
        {props.description}
      </Typography>
    </Stack>
  );
}

function FeaturePillar(props: { title: string; description: string; icon: ReactNode; chips: string[] }) {
  return (
    <Card sx={{ borderRadius: 4, height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.25}>
          <Box sx={{ color: "secondary.main" }}>{props.icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {props.title}
          </Typography>
          <Typography color="text.secondary">{props.description}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {props.chips.map((c) => (
              <Chip key={c} size="small" label={c} sx={{ bgcolor: "rgba(15, 23, 42, 0.06)" }} />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function About() {
  return (
    <>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <SectionTitle
          overline="About"
          title="SalesPilot AI helps teams sell with consistency."
          description="We combine predictive scoring with prescriptive next-best actions so sales teams can focus on what matters: the right opportunities, at the right time, with a repeatable process."
        />

        <Box sx={{ mt: 4, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Positioning
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>AI-powered sales automation</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                A control center for scoring, routing, and actioning leads with high confidence.
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Outcome
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>More pipeline, less chaos</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Clear prioritization, faster follow-up, and operational consistency across the team.
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Designed for
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.5 }}>Executives & sales ops</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Calm, structured UI and decision-grade analytics that are easy to act on.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Divider sx={{ mb: 4 }} />
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
            What makes the platform different
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 820 }}>
            SalesPilot AI is not just reporting. It’s an execution layer: it predicts outcomes and prescribes actions
            with a clear operating model.
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
          <FeaturePillar
            icon={<TrendingUpOutlined />}
            title="Predictive scoring"
            description="A trained model estimates conversion probability and turns it into a score and tier."
            chips={["Probability", "Score (0–100)", "Hot/Warm/Cold"]}
          />
          <FeaturePillar
            icon={<AutoAwesomeOutlined />}
            title="Prescriptive actions"
            description="Every tier maps to a recommended follow-up approach so the team executes consistently."
            chips={["Next-best action", "Priority", "Standardized playbooks"]}
          />
          <FeaturePillar
            icon={<ShieldOutlined />}
            title="Enterprise foundation"
            description="Role-based access and a scalable backend designed for production-grade workflows."
            chips={["Admin vs Sales", "JWT auth", "Audit-friendly records"]}
          />
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 4 }}>
              <Stack spacing={1.25}>
                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
                  Platform principles
                </Typography>
                <Typography color="text.secondary">
                  We design for trust, clarity, and execution. The UI should be calm and structured, and the system
                  should always answer: “What should we do next?”
                </Typography>
              </Stack>
              <Stack spacing={1.25}>
                {[
                  ["Clarity over clutter", "Minimal noise, strong hierarchy, and decision-ready dashboards."],
                  ["Automation with control", "Prescriptions that can be reviewed and improved over time."],
                  ["Scalable by design", "Data models and workflows that expand with the sales org."],
                  ["Professional by default", "Enterprise-grade design system and consistent UI patterns."],
                ].map(([t, d]) => (
                  <Box key={t}>
                    <Typography sx={{ fontWeight: 900 }}>{t}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {d}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
