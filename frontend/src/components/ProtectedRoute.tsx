import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/api/types";

export default function ProtectedRoute(props: { roles?: UserRole[] }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (props.roles?.length) {
    const role = user?.role ?? null;
    if (!role || !props.roles.includes(role)) {
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return <Outlet />;
}
