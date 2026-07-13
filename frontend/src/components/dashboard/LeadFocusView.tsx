import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Tooltip,
  Paper,
} from "@mui/material";
import {
  ArrowBack,
  PushPin,
  PushPinOutlined,
  Edit,
  NoteAdd,
  SwapHoriz,
  Phone,
  Email,
  Business,
  Work,
} from "@mui/icons-material";
import { useFocus } from "@/contexts/FocusContext";
import { getLeadActivities } from "@/api/http";
import type { LeadPublic, ActivityPublic } from "@/api/types";
import ScoreChip from "@/components/ScoreChip";

export default function LeadFocusView() {
  const { focusedLead, clearFocus, pinnedLeads, pinLead, unpinLead } = useFocus();
  const isPinned = pinnedLeads.some((lead) => lead.lead_id === focusedLead?.lead_id);
  const [activities, setActivities] = useState<ActivityPublic[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    async function fetchActivities() {
      if (!focusedLead?.lead_id) {
        setActivities([]);
        return;
      }
      setLoadingActivities(true);
      try {
        const data = await getLeadActivities(focusedLead.lead_id);
        setActivities(data);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
        setActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    }
    fetchActivities();
  }, [focusedLead?.lead_id]);

  if (!focusedLead) {
    return null;
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={clearFocus}>
            <ArrowBack />
          </IconButton>
          <Avatar
            sx={{ width: 48, height: 48, bgcolor: "primary.main" }}
          >
            {focusedLead.first_name?.charAt(0)?.toUpperCase() ?? "U"}
          </Avatar>
          <Stack>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {focusedLead.first_name} {focusedLead.last_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {focusedLead.company_name}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title={isPinned ? "Unpin lead" : "Pin lead"}>
            <IconButton
              color={isPinned ? "primary" : "default"}
              onClick={() =>
                isPinned ? unpinLead(focusedLead.lead_id) : pinLead(focusedLead.lead_id)
              }
            >
              {isPinned ? <PushPin /> : <PushPinOutlined />}
            </IconButton>
          </Tooltip>
          <Chip
            label={focusedLead.lead_status}
            color={
              focusedLead.lead_status === "Qualified"
                ? "success"
                : focusedLead.lead_status === "Converted"
                ? "primary"
                : "default"
            }
          />
          <ScoreChip category="Hot" />
        </Stack>
      </Stack>

      {/* Main Content Grid */}
      <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {/* Left Column: Lead Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Lead Details
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2}>
                <Phone fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body2">{focusedLead.phone_number}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2}>
                <Email fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body2">{focusedLead.email}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2}>
                <Business fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Company
                  </Typography>
                  <Typography variant="body2">{focusedLead.company_name}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2}>
                <Work fontSize="small" color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Job Title
                  </Typography>
                  <Typography variant="body2">{focusedLead.job_title}</Typography>
                </Box>
              </Stack>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Company Info
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Industry
                </Typography>
                <Typography variant="body2">{focusedLead.company_industry}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Est. Annual Revenue
                </Typography>
                <Typography variant="body2">
                  ₦{focusedLead.estimated_annual_revenue.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Lead Source
                </Typography>
                <Typography variant="body2">{focusedLead.lead_source}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Right Column: AI & Quick Actions */}
        <Stack spacing={3}>
          {/* AI Recommendation */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                AI Recommendation
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Conversion Probability
                  </Typography>
                  <Typography variant="h4" sx={{ color: "success.main", fontWeight: 700 }}>
                    82%
                  </Typography>
                </Box>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: "rgba(22, 163, 74, 0.05)",
                    border: "1px solid rgba(22, 163, 74, 0.12)",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">
                    Next Best Action: Schedule a product demo to address their interest in your enterprise features.
                  </Typography>
                </Paper>
              </Stack>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Quick Actions
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  fullWidth
                >
                  Edit Lead
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<NoteAdd />}
                  fullWidth
                >
                  Add Note
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SwapHoriz />}
                  fullWidth
                >
                  Change Status
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>

      {/* Activity Timeline */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Activity Timeline
        </Typography>
        <Stack spacing={2}>
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <Paper
                key={activity.activity_id}
                sx={{
                  p: 2,
                  display: "flex",
                  gap: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: activity.activity_type === "Call"
                      ? "primary.main"
                      : activity.activity_type === "Email"
                      ? "success.main"
                      : "secondary.main",
                  }}
                >
                  {activity.activity_type.charAt(0)}
                </Avatar>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activity.activity_type}
                    </Typography>
                    <Chip
                      label={activity.outcome}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  {activity.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {activity.notes}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.created_at).toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No activities yet. Start by adding a note!
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}