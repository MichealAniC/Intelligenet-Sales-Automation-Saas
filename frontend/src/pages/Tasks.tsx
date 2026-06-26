import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

interface Task {
  id: number;
  title: string;
  status: "todo" | "completed";
  dueDate: string;
  priority: "high" | "medium" | "low";
}

const mockTasks: Task[] = [
  {
    id: 1,
    title: "Follow up with Rudolph Wonderland",
    status: "todo",
    dueDate: "2026-06-27",
    priority: "high",
  },
  {
    id: 2,
    title: "Send contract to Frost Inc.",
    status: "todo",
    dueDate: "2026-06-28",
    priority: "high",
  },
  {
    id: 3,
    title: "Check in with Sarah from TechCorp",
    status: "todo",
    dueDate: "2026-06-29",
    priority: "medium",
  },
  {
    id: 4,
    title: "Prepare demo slides for client meeting",
    status: "completed",
    dueDate: "2026-06-25",
    priority: "medium",
  },
  {
    id: 5,
    title: "Send thank you note to Global Solutions",
    status: "completed",
    dueDate: "2026-06-24",
    priority: "low",
  },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const handleToggleTask = (id: number) => {
    setTasks(tasks.map((task) => {
      if (task.id === id) {
        return {
          ...task,
          status: task.status === "todo" ? "completed" : "todo",
        };
      }
      return task;
    }));
  };

  const todoTasks = tasks.filter((task) => task.status === "todo");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.75}>
        <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.6 }}>
          My Tasks
        </Typography>
        <Typography color="text.secondary">
          Manage your follow-up tasks and reminders.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: 2,
        }}
      >
        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>To-Do</Typography>
              <Chip label={todoTasks.length} size="small" color="primary" />
            </Stack>
            {todoTasks.length > 0 ? (
              <List sx={{ p: 0 }}>
                {todoTasks.map((task, index) => (
                  <ListItem
                    key={task.id}
                    disablePadding
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <IconButton edge="end" size="small">
                          <EditOutlinedIcon />
                        </IconButton>
                        <IconButton edge="end" size="small">
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Stack>
                    }
                    sx={{ mb: index < todoTasks.length - 1 ? 1 : 0 }}
                  >
                    <ListItemButton onClick={() => handleToggleTask(task.id)}>
                      <ListItemIcon>
                        <Checkbox edge="start" checked={false} tabIndex={-1} disableRipple />
                      </ListItemIcon>
                      <ListItemText
                        primary={task.title}
                        secondary={`Due: ${task.dueDate}`}
                      />
                      <Chip
                        label={task.priority}
                        size="small"
                        color={getPriorityColor(task.priority)}
                        variant="outlined"
                      />
                    </ListItemButton>
                    {index < todoTasks.length - 1 && <Divider />}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No tasks in To-Do</Typography>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>Completed</Typography>
              <Chip label={completedTasks.length} size="small" color="success" />
            </Stack>
            {completedTasks.length > 0 ? (
              <List sx={{ p: 0 }}>
                {completedTasks.map((task, index) => (
                  <ListItem
                    key={task.id}
                    disablePadding
                    secondaryAction={
                      <IconButton edge="end" size="small">
                        <DeleteOutlineIcon />
                      </IconButton>
                    }
                    sx={{ mb: index < completedTasks.length - 1 ? 1 : 0 }}
                  >
                    <ListItemButton onClick={() => handleToggleTask(task.id)}>
                      <ListItemIcon>
                        <Checkbox edge="start" checked={true} tabIndex={-1} disableRipple />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            component="span"
                            sx={{ textDecoration: "line-through", color: "text.secondary" }}
                          >
                            {task.title}
                          </Typography>
                        }
                        secondary={`Completed: ${task.dueDate}`}
                      />
                    </ListItemButton>
                    {index < completedTasks.length - 1 && <Divider />}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">No completed tasks</Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
