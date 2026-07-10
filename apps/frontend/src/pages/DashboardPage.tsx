import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  if (isLoading) return <p>Завантаження...</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>Колекція</h1>
        <p>Огляд вашої бібліотеки відеоігор</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{data?.totalGames ?? 0}</div>
          <div className="label">Всього ігор</div>
        </div>
        <div className="stat-card">
          <div className="value">
            {(data?.totalSpent ?? 0).toLocaleString("uk-UA")} ₴
          </div>
          <div className="label">Витрачено</div>
        </div>
        <div className="stat-card">
          <div className="value">{data?.byPlatform.length ?? 0}</div>
          <div className="label">Платформ</div>
        </div>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.1rem" }}>По платформах</h2>
      <div className="grid grid-2">
        {data?.byPlatform.map((p) => (
          <Link key={p.platformId} to={`/platforms/${p.platformId}`} className="platform-card">
            <h3>{p.name}</h3>
            <div className="count">
              {p.count} {p.count === 1 ? "гра" : "ігор"}
              {p.spent > 0 && ` · ${p.spent.toLocaleString("uk-UA")} ₴`}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
