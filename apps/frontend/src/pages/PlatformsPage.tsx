import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function PlatformsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["platforms"],
    queryFn: api.getPlatforms,
  });

  if (isLoading) return <p>Завантаження...</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>Платформи</h1>
        <p>Оберіть платформу для перегляду колекції</p>
      </header>

      <div className="grid grid-2">
        {data?.map((platform) => (
          <Link
            key={platform.id}
            to={`/platforms/${platform.id}`}
            className="platform-card"
          >
            <h3>{platform.name}</h3>
            <div className="count">
              <span className="badge">{platform.shortName}</span>
              {" · "}
              {platform.gameCount ?? 0} ігор
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
