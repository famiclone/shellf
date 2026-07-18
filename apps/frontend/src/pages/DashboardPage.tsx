import { useQuery } from "@tanstack/react-query";
import { LuChartLine, LuGamepad2, LuLayers, LuWallet } from "react-icons/lu";
import { Link } from "react-router-dom";
import type { DashboardPricedItem } from "@shellf/shared";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

function PricedItemRow({
  item,
  numberLocale,
}: {
  item: DashboardPricedItem;
  numberLocale: string;
}) {
  return (
    <Link to={`/items/${item.id}`} className="dashboard-priced-row">
      <div className="dashboard-priced-thumb">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt="" />
        ) : (
          <span className="placeholder">?</span>
        )}
      </div>
      <div className="dashboard-priced-body">
        <div className="dashboard-priced-title">{item.title}</div>
        <div className="meta">{item.groupName}</div>
      </div>
      <div className="dashboard-priced-value">
        $
        {item.marketValue.toLocaleString(numberLocale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}
      </div>
    </Link>
  );
}

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

  const topExpensive = data?.topExpensive ?? [];
  const topCheapest = data?.topCheapest ?? [];

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

      {(topExpensive.length > 0 || topCheapest.length > 0) && (
        <div className="dashboard-priced-grid">
          <section className="card dashboard-priced-card">
            <h2>{t("dashboard.topExpensive")}</h2>
            {topExpensive.length > 0 ? (
              <div className="dashboard-priced-list">
                {topExpensive.map((item) => (
                  <PricedItemRow
                    key={item.id}
                    item={item}
                    numberLocale={numberLocale}
                  />
                ))}
              </div>
            ) : (
              <p className="meta">{t("dashboard.noMarketPrices")}</p>
            )}
          </section>
          <section className="card dashboard-priced-card">
            <h2>{t("dashboard.topCheapest")}</h2>
            {topCheapest.length > 0 ? (
              <div className="dashboard-priced-list">
                {topCheapest.map((item) => (
                  <PricedItemRow
                    key={`cheap-${item.id}`}
                    item={item}
                    numberLocale={numberLocale}
                  />
                ))}
              </div>
            ) : (
              <p className="meta">{t("dashboard.noMarketPrices")}</p>
            )}
          </section>
        </div>
      )}

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
