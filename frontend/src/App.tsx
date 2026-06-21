import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "@/layout/AuthLayout";
import AppShell from "@/layout/AppShell";
import PublicLayout from "@/layout/PublicLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import Services from "@/pages/Services";
import Dashboard from "@/pages/Dashboard";
import LeadNew from "@/pages/LeadNew";
import LeadDetail from "@/pages/LeadDetail";
import Leads from "@/pages/Leads";
import LeadImport from "@/pages/LeadImport";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AcceptInvite from "@/pages/AcceptInvite";
import Me from "@/pages/Me";
import ComingSoon from "@/pages/ComingSoon";
import Team from "@/pages/Team";
import SalesTeam from "@/pages/SalesTeam";
import TeamManagement from "@/pages/TeamManagement";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
        </Route>
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />
        <Route
          path="/register"
          element={
            <AuthLayout>
              <Register />
            </AuthLayout>
          }
        />
        <Route
          path="/invite/:token"
          element={
            <AuthLayout>
              <AcceptInvite />
            </AuthLayout>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:leadId" element={<LeadDetail />} />
            <Route element={<ProtectedRoute roles={["Admin"]} />}>
              <Route path="leads/import" element={<LeadImport />} />
              <Route path="routing" element={<ComingSoon title="Routing Rules" description="Define rules for assignment and prioritization by segment and tier." />} />
              <Route path="sales-team" element={<SalesTeam />} />
              <Route path="team-management" element={<TeamManagement />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<ComingSoon title="Settings" description="Security, integrations, and platform preferences." />} />
            </Route>
            <Route path="leads/new" element={<LeadNew />} />
            <Route path="pipeline" element={<ComingSoon title="Pipeline" description="Pipeline stages, deal tracking, and workflow execution." />} />
            <Route path="analytics" element={<ComingSoon title="Analytics" description="Conversion trends, source distribution, and revenue insights." />} />
            <Route path="tasks" element={<ComingSoon title="Tasks" description="Your assigned tasks and follow-up reminders." />} />
            <Route path="activities" element={<ComingSoon title="Activities" description="Recent calls, emails, meetings, and engagement logs." />} />
            <Route path="me" element={<Me />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/leads/new" element={<Navigate to="/app/leads/new" replace />} />
        <Route path="/leads" element={<Navigate to="/app/leads" replace />} />
        <Route path="/me" element={<Navigate to="/app/me" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
