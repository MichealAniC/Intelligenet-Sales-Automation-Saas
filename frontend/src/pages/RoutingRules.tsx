import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

export default function RoutingRules() {
  const [assignmentStrategy, setAssignmentStrategy] = useState<"round-robin" | "ai-score">("ai-score");
  const [maxCapacityPerRep, setMaxCapacityPerRep] = useState(50);
  const [autoAssignNewLeads, setAutoAssignNewLeads] = useState(true);
  const [prioritizeHotLeads, setPrioritizeHotLeads] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Routing Rules Configuration
        </Typography>
        <Typography color="text.secondary">
          Configure lead assignment strategy and team capacity rules.
        </Typography>
      </Stack>

      {saved && <Alert severity="success">Routing rules saved successfully!</Alert>}

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Assignment Strategy</Typography>
              <FormControl fullWidth>
                <InputLabel>Strategy</InputLabel>
                <Select
                  value={assignmentStrategy}
                  label="Strategy"
                  onChange={(e) => setAssignmentStrategy(e.target.value as any)}
                >
                  <MenuItem value="round-robin">Round Robin</MenuItem>
                  <MenuItem value="ai-score">AI Score Priority</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Capacity Rules</Typography>
              <TextField
                type="number"
                label="Max Capacity per Rep"
                value={maxCapacityPerRep}
                onChange={(e) => setMaxCapacityPerRep(Number(e.target.value))}
                fullWidth
                InputProps={{ inputProps: { min: 1, max: 200 } }}
              />
            </Stack>

            <Stack spacing={2}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Auto-Assignment Settings</Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoAssignNewLeads}
                      onChange={(e) => setAutoAssignNewLeads(e.target.checked)}
                    />
                  }
                  label="Auto-assign new leads"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={prioritizeHotLeads}
                      onChange={(e) => setPrioritizeHotLeads(e.target.checked)}
                    />
                  }
                  label="Prioritize Hot leads"
                />
              </FormGroup>
            </Stack>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
