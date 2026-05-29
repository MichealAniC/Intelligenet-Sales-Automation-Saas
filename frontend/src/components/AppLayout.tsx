import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

function NavItem(props: { to: string; label: string }) {
  return (
    <li className="nav-item">
      <NavLink
        to={props.to}
        className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      >
        {props.label}
      </NavLink>
    </li>
  );
}

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const logout = () => {
    navigate("/", { replace: true });
    clear();
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid">
          <NavLink to="/dashboard" className="navbar-brand">
            Intelligenet
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <NavItem to="/dashboard" label="Dashboard" />
              <NavItem to="/leads/new" label="Lead Intake" />
              {user?.role === "Admin" ? <NavItem to="/leads" label="Leads" /> : null}
              <NavItem to="/me" label="Profile" />
            </ul>

            <div className="d-flex align-items-center gap-3">
              <div className="text-light small">
                {user ? (
                  <span>
                    {user.full_name} ({user.role})
                  </span>
                ) : null}
              </div>
              <button className="btn btn-outline-light btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="border-top py-3">
        <div className="container small text-muted">
          Intelligent Sales Automation SaaS
        </div>
      </footer>
    </div>
  );
}
