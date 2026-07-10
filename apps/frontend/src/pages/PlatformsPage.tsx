import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

export function PlatformsPage() {
  const { t } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["platforms"],
    queryFn: api.getPlatforms,
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>{t("platforms.title")}</h1>
        <p>{t("platforms.subtitle")}</p>
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
              {t("platforms.gameMany", { count: platform.gameCount ?? 0 })}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
