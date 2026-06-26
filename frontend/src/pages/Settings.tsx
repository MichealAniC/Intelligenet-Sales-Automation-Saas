import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Tabs,
  Tab,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import { useAuthStore } from "@/stores/auth";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  };
}

export default function Settings() {
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // General settings state
  const [companyName, setCompanyName] = useState("Micheal Ani");
  const [timezone, setTimezone] = useState("America/New_York");
  const [currency, setCurrency] = useState("NGN");

  // Security settings state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  // Notifications settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Settings
        </Typography>
        <Typography color="text.secondary">
          Manage your organization settings, security, and notifications.
        </Typography>
      </Stack>

      {saved && <Alert severity="success">Settings saved successfully!</Alert>}

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
                <Tab label="General" {...a11yProps(0)} />
                <Tab label="Security" {...a11yProps(1)} />
                <Tab label="Notifications" {...a11yProps(2)} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Stack spacing={2.5}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Company Details</Typography>
                <TextField
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={timezone}
                    label="Timezone"
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                    <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                    <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                    <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                    <MenuItem value="Europe/London">London (GMT)</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={currency}
                    label="Currency"
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <MenuItem value="NGN">NGN (₦)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="GBP">GBP (£)</MenuItem>
                    <MenuItem value="CAD">CAD ($)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Stack spacing={2.5}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Security</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={twoFactorEnabled}
                        onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                      />
                    }
                    label="Enable Two-Factor Authentication (2FA)"
                  />
                </FormGroup>
                <TextField
                  type="number"
                  label="Session Timeout (minutes)"
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  fullWidth
                  InputProps={{ inputProps: { min: 5, max: 1440 } }}
                />
                <Divider />
                <Typography sx={{ fontWeight: 700 }}>Password</Typography>
                <Button variant="outlined" size="small">
                  Reset Password
                </Button>
              </Stack>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Stack spacing={2.5}>
                <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Notification Preferences</Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                      />
                    }
                    label="Email Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={slackNotifications}
                        onChange={(e) => setSlackNotifications(e.target.checked)}
                      />
                    }
                    label="Slack Notifications"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={smsNotifications}
                        onChange={(e) => setSmsNotifications(e.target.checked)}
                      />
                    }
                    label="SMS Notifications"
                  />
                </FormGroup>
              </Stack>
            </TabPanel>

            <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
