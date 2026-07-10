import { useQuery } from "@tanstack/react-query";
import { LuChartLine, LuGamepad2, LuLayers, LuWallet } from "react-icons/lu";
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

  const byGroup =
    data?.byGroup?.filter((g) => g.count > 0) ??
    data?.byPlatform
      ?.filter((p) => p.count > 0)
      .map((p) => ({
        groupId: p.platformId,
        name: p.name,
        count: p.count,
        spent: p.spent,
      })) ??
    [];

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
          <div className="value">{data?.totalItems ?? data?.totalGames ?? 0}</div>
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
            <LuChartLine />
          </div>
          <div className="value">
            $
            {(data?.totalMarketValue ?? 0).toLocaleString(numberLocale, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="label">{t("dashboard.marketValue")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" aria-hidden>
            <LuLayers />
          </div>
          <div className="value">{byGroup.length}</div>
          <div className="label">{t("dashboard.platforms")}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>
        {t("dashboard.byPlatform")}
      </h2>
      <div className="grid grid-2">
        {byGroup.map((g) => (
          <Link key={g.groupId} to={`/groups/${g.groupId}`} className="platform-card">
            <h3>{g.name}</h3>
            <div className="count">
              {t(g.count === 1 ? "dashboard.gameOne" : "dashboard.gameMany", {
                count: g.count,
              })}
              {g.spent > 0 && ` · ${g.spent.toLocaleString(numberLocale)} ₴`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
