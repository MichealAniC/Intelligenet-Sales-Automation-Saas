import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import {
  AutoAwesomeOutlined,
  BoltOutlined,
  InsightsOutlined,
  ShieldOutlined,
  SwapHorizOutlined,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function HeroVisual() {
  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Conversion probability",
        data: [34, 38, 44, 57, 61, 66, 72],
        borderColor: "#2563EB",
        backgroundColor: "rgba(37, 99, 235, 0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: "rgba(15, 23, 42, 0.06)" }, ticks: { display: false } },
      x: { grid: { display: false }, ticks: { color: "#64748B" } },
    },
  } as const;

  return (
    <Card sx={{ borderRadius: 4, overflow: "hidden" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            AI Sales Control Center
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Decision-grade analytics, not noise
          </Typography>
        </Stack>
        <Line data={data} options={options} />
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          <Chip size="small" label="Hot leads flagged" color="warning" />
          <Chip size="small" label="Routing recommendations" sx={{ bgcolor: "rgba(37, 99, 235, 0.10)" }} />
          <Chip size="small" label="Executive reporting" sx={{ bgcolor: "rgba(15, 23, 42, 0.06)" }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function FeatureCard(props: { icon: import("react").ReactNode; title: string; description: string }) {
  return (
    <Card sx={{ height: "100%", borderRadius: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={1.25}>
          <Box sx={{ color: "secondary.main" }}>{props.icon}</Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {props.title}
          </Typography>
          <Typography color="text.secondary">{props.description}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Landing() {
  return (
    <>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: { xs: 4, md: 5 },
            alignItems: "center",
          }}
        >
          <Box>
            <Stack spacing={2.25}>
              <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: -1.0, lineHeight: 1.05 }}>
                Smarter Sales Decisions. Automated.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                SalesPilot AI is an AI-powered sales automation platform that predicts lead conversion
                probability, prescribes next-best actions, and routes opportunities with confidence.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button component={Link} to="/register" variant="contained" color="secondary" size="large">
                  Get Started
                </Button>
                <Button component={Link} to="/login" variant="outlined" color="primary" size="large">
                  Login
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip label="Predictive Scoring" sx={{ bgcolor: "rgba(37, 99, 235, 0.10)" }} />
                <Chip label="Prescriptive Automation" sx={{ bgcolor: "rgba(245, 158, 11, 0.12)" }} />
                <Chip label="Routing Engine" sx={{ bgcolor: "rgba(15, 23, 42, 0.06)" }} />
              </Stack>
            </Stack>
          </Box>
          <Box>
            <HeroVisual />
          </Box>
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>
            Built for real sales operations
          </Typography>
          <Typography color="text.secondary">
            A calm, structured platform that helps teams focus on the right deals and execute consistently.
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
          }}
        >
          <FeatureCard
            icon={<InsightsOutlined />}
            title="Predictive Lead Scoring"
            description="Model-backed probability scoring to surface opportunities that deserve immediate focus."
          />
          <FeatureCard
            icon={<AutoAwesomeOutlined />}
            title="Prescriptive Automation"
            description="Turn scores into actions: prioritize, assign, and standardize follow-up decisions."
          />
          <FeatureCard
            icon={<SwapHorizOutlined />}
            title="AI Routing Engine"
            description="Route hot opportunities to senior reps and keep warm leads moving with confidence."
          />
          <FeatureCard
            icon={<BoltOutlined />}
            title="Pipeline Analytics"
            description="Executive-grade charts for conversion trends, sources, and performance patterns."
          />
          <FeatureCard
            icon={<ShieldOutlined />}
            title="Enterprise Ready"
            description="Role-based access, secure auth, and a scalable architecture designed for growth."
          />
          <FeatureCard
            icon={<InsightsOutlined />}
            title="Revenue Insights"
            description="See what's likely to convert and forecast outcomes with fewer assumptions."
          />
        </Box>
      </Container>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Card sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" },
                gap: 4,
              }}
            >
              <Box>
                <Stack spacing={1.25}>
                  <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
                    How it works
                  </Typography>
                  <Typography color="text.secondary">
                    Capture leads, score conversion probability, categorize priority, assign intelligently, and take
                    consistent next-best actions.
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  {[
                    ["Capture", "Collect structured lead + engagement signals."],
                    ["Predict", "Score conversion probability using the trained model."],
                    ["Prescribe", "Recommend actions based on Hot/Warm/Cold tiers."],
                    ["Route", "Assign leads to the right rep automatically."],
                  ].map(([t, d]) => (
                    <Stack key={t} spacing={0.5}>
                      <Typography sx={{ fontWeight: 800 }}>{t}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {d}
                      </Typography>
                    </Stack>
                  ))}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
