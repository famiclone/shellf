import { Link, Outlet, useLocation } from "react-router-dom";
import "./Layout.css";

const nav = [
  { to: "/", label: "Головна" },
  { to: "/platforms", label: "Платформи" },
  { to: "/games/new", label: "Додати гру" },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">▣</span>
          <span className="logo-text">Shellf</span>
        </div>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                location.pathname === item.to ||
                (item.to !== "/" && location.pathname.startsWith(item.to))
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
