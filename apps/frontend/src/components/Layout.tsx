import { useState } from "react";
import {
  LuGamepad2,
  LuHouse,
  LuLayers,
  LuPlus,
  LuSettings,
} from "react-icons/lu";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "../lib/i18n";
import { SettingsPanel } from "./SettingsPanel";
import "./Layout.css";

export function Layout() {
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useI18n();

  const nav = [
    { to: "/", label: t("nav.home"), icon: LuHouse },
    { to: "/platforms", label: t("nav.platforms"), icon: LuLayers },
    { to: "/games/new", label: t("nav.addGame"), icon: LuPlus },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <span className="logo-icon" aria-hidden>
              <LuGamepad2 />
            </span>
            <span className="logo-text">Shellf</span>
          </div>
          <nav>
            {nav.map((item) => {
              const Icon = item.icon;
              return (
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
                  <Icon aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-link settings-btn"
            onClick={() => setSettingsOpen(true)}
          >
            <LuSettings aria-hidden />
            {t("nav.settings")}
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
