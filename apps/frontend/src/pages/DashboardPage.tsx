import { useQuery } from "@tanstack/react-query";
import { LuGamepad2, LuLayers, LuWallet } from "react-icons/lu";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

export function DashboardPage() {
  const { t, numberLocale } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>{t("dashboard.title")}</h1>
        <p>{t("dashboard.subtitle")}</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" aria-hidden>
            <LuGamepad2 />
          </div>
          <div className="value">{data?.totalGames ?? 0}</div>
          <div className="label">{t("dashboard.totalGames")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" aria-hidden>
            <LuWallet />
          </div>
          <div className="value">
            {(data?.totalSpent ?? 0).toLocaleString(numberLocale)} ₴
          </div>
          <div className="label">{t("dashboard.spent")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" aria-hidden>
            <LuLayers />
          </div>
          <div className="value">{data?.byPlatform.length ?? 0}</div>
          <div className="label">{t("dashboard.platforms")}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
        {t("dashboard.byPlatform")}
      </h2>
      <div className="grid grid-2">
        {data?.byPlatform.map((p) => (
          <Link key={p.platformId} to={`/platforms/${p.platformId}`} className="platform-card">
            <h3>{p.name}</h3>
            <div className="count">
              {t(p.count === 1 ? "dashboard.gameOne" : "dashboard.gameMany", {
                count: p.count,
              })}
              {p.spent > 0 && ` · ${p.spent.toLocaleString(numberLocale)} ₴`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
