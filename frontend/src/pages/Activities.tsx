import {
  Avatar,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import CallIcon from "@mui/icons-material/Call";
import EmailIcon from "@mui/icons-material/Email";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import NoteIcon from "@mui/icons-material/Note";

interface Activity {
  id: number;
  type: "call" | "email" | "status_change" | "note";
  title: string;
  description: string;
  timestamp: string;
  leadName: string;
}

const mockActivities: Activity[] = [
  {
    id: 1,
    type: "call",
    title: "Called Lead",
    description: "Spoke for 15 minutes, discussed pricing options",
    timestamp: "2026-06-26 14:30",
    leadName: "Rudolph Wonderland",
  },
  {
    id: 2,
    type: "status_change",
    title: "Changed Status",
    description: "Updated status from Contacted to Qualified",
    timestamp: "2026-06-26 12:15",
    leadName: "Frost Inc.",
  },
  {
    id: 3,
    type: "email",
    title: "Sent Email",
    description: "Sent proposal and pricing details",
    timestamp: "2026-06-26 10:45",
    leadName: "Sarah from TechCorp",
  },
  {
    id: 4,
    type: "note",
    title: "Added Note",
    description: "Follow up next week to discuss contract terms",
    timestamp: "2026-06-25 16:20",
    leadName: "Global Solutions",
  },
  {
    id: 5,
    type: "call",
    title: "Received Call",
    description: "Lead called back, scheduled demo for Monday",
    timestamp: "2026-06-25 11:30",
    leadName: "Acme Corp",
  },
];

const getActivityIcon = (type: Activity["type"]) => {
  switch (type) {
    case "call":
      return <CallIcon />;
    case "email":
      return <EmailIcon />;
    case "status_change":
      return <TrendingUpIcon />;
    case "note":
      return <NoteIcon />;
    default:
      return <NoteIcon />;
  }
};

const getActivityColor = (type: Activity["type"]) => {
  switch (type) {
    case "call":
      return "primary.main";
    case "email":
      return "success.main";
    case "status_change":
      return "warning.main";
    case "note":
      return "secondary.main";
    default:
      return "text.secondary";
  }
};

export default function Activities() {
  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          Recent Activities
        </Typography>
        <Typography color="text.secondary">
          View your chronological list of lead engagement activities.
        </Typography>
      </Stack>

      <Card sx={{ borderRadius: 1 }}>
        <CardContent sx={{ p: 3 }}>
          <List sx={{ p: 0 }}>
            {mockActivities.map((activity, index) => (
              <ListItem key={activity.id} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getActivityColor(activity.type) }}>
                    {getActivityIcon(activity.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 700 }}>{activity.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.timestamp}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                        {activity.leadName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.description}
                      </Typography>
                    </Box>
                  }
                />
                {index < mockActivities.length - 1 && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 20,
                      top: 40,
                      bottom: 0,
                      width: 2,
                      bgcolor: "divider",
                    }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}
