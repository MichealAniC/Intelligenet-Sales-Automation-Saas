import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

export default function Home() {
  const token = useAuthStore((s) => s.token);
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}
