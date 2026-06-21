import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  AddOutlined,
  AnalyticsOutlined,
  AssignmentIndOutlined,
  BarChartOutlined,
  ChevronLeft,
  DashboardOutlined,
  EventOutlined,
  GroupOutlined,
  Menu as MenuIcon,
  NotificationsNoneOutlined,
  PersonOutlined,
  RuleOutlined,
  SettingsOutlined,
  TaskAltOutlined,
  TrendingUpOutlined,
  UploadFileOutlined,
  ViewListOutlined,
} from "@mui/icons-material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";

const drawerWidth = 272;

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const nav = useMemo<NavItem[]>(() => {
    if (user?.role === "Admin") {
      return [
        { label: "Dashboard", href: "/app/dashboard", icon: <DashboardOutlined /> },
        { label: "Leads", href: "/app/leads", icon: <TrendingUpOutlined /> },
        { label: "Import Leads", href: "/app/leads/import", icon: <UploadFileOutlined /> },
        { label: "Routing Rules", href: "/app/routing", icon: <RuleOutlined /> },
        { label: "Sales Team", href: "/app/sales-team", icon: <GroupOutlined /> },
        { label: "Team Management", href: "/app/team-management", icon: <BarChartOutlined /> },
        { label: "Pipeline", href: "/app/pipeline", icon: <TrendingUpOutlined /> },
        { label: "Analytics", href: "/app/analytics", icon: <AnalyticsOutlined /> },
        { label: "Settings", href: "/app/settings", icon: <SettingsOutlined /> },
      ];
    }

    // Sales Member menu
    return [
      { label: "Dashboard", href: "/app/dashboard", icon: <DashboardOutlined /> },
      { label: "My Leads", href: "/app/leads", icon: <AssignmentIndOutlined /> },
      { label: "My Pipeline", href: "/app/pipeline", icon: <ViewListOutlined /> },
      { label: "Tasks", href: "/app/tasks", icon: <TaskAltOutlined /> },
      { label: "Activities", href: "/app/activities", icon: <EventOutlined /> },
      { label: "Profile", href: "/app/me", icon: <PersonOutlined /> },
    ];
  }, [user?.role]);

  const activeHref = useMemo(() => {
    const candidate = nav.find((n) => location.pathname.startsWith(n.href));
    return candidate?.href ?? "";
  }, [location.pathname, nav]);

  const logout = () => {
    navigate("/", { replace: true });
    clear();
  };

  const drawerContent = (
    <Stack sx={{ height: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
        <Stack spacing={0} sx={{ cursor: "pointer" }} onClick={() => navigate("/app/dashboard")}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            SalesPilot AI
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Intelligent Sales Control Center
          </Typography>
        </Stack>
        <Tooltip title={collapsed ? "Expand" : "Collapse"}>
          <IconButton size="small" onClick={() => setCollapsed((v) => !v)}>
            <ChevronLeft sx={{ transform: collapsed ? "rotate(180deg)" : "none" }} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Divider />
      <Box sx={{ px: 1, pt: 1 }}>
        <List dense>
          {nav.map((item) => (
            <ListItemButton
              key={item.href}
              selected={activeHref === item.href}
              onClick={() => {
                navigate(item.href);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: collapsed ? 1.25 : 2,
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, color: "inherit" }}>
                {item.icon}
              </ListItemIcon>
              {collapsed ? null : <ListItemText primary={item.label} />}
            </ListItemButton>
          ))}
        </List>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Stack sx={{ p: 2 }} spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "secondary.main" }}>
            {user?.full_name?.slice(0, 1)?.toUpperCase() ?? "U"}
          </Avatar>
          {collapsed ? null : (
            <Stack spacing={0} sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {user?.full_name ?? "User"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user?.organization_name ? `${user.organization_name} • ${user.role}` : user?.role ?? ""}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100%", overflowX: "hidden", maxWidth: "100vw" }}>
      <AppBar
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          color: "text.primary",
          zIndex: (t) => t.zIndex.drawer + 1,
          width: { md: `calc(100% - ${collapsed ? 88 : drawerWidth}px)` },
          ml: { md: `${collapsed ? 88 : drawerWidth}px` },
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: "space-between" }}>
          <Stack direction="row" alignItems="center" sx={{ gap: 2, minWidth: 0, flex: 1 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>

            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: { xs: "none", md: "block" } }}>
              {nav.find((n) => activeHref === n.href)?.label ?? "SalesPilot AI"}
            </Typography>

            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                border: "1px solid rgba(15, 23, 42, 0.12)",
                borderRadius: 1,
                px: 2,
                py: 0.5,
                bgcolor: "rgba(15, 23, 42, 0.02)",
                maxWidth: 520,
              }}
            >
              <InputBase placeholder="Search leads, companies, reps..." fullWidth />
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="Notifications">
              <IconButton>
                <Badge variant="dot" color="warning">
                  <NotificationsNoneOutlined />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Account">
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                  {user?.full_name?.slice(0, 1)?.toUpperCase() ?? "U"}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Stack>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/app/me");
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                logout();
              }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: collapsed ? 88 : drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: collapsed ? 88 : drawerWidth,
            boxSizing: "border-box",
            overflowX: "hidden",
            borderRight: "1px solid rgba(15, 23, 42, 0.08)",
            bgcolor: "background.paper",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          pt: { xs: 10, md: 11 },
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          bgcolor: "background.default",
          minHeight: "100vh",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
