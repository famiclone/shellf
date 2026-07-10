import { useQuery } from "@tanstack/react-query";
import { LuPlus } from "react-icons/lu";
import { Link, useParams } from "react-router-dom";
import type { GameCondition } from "@shellf/shared";
import { api, getGameCover } from "../lib/api";
import { useI18n, type MessageKey } from "../lib/i18n";

export function PlatformGamesPage() {
  const { id } = useParams<{ id: string }>();
  const platformId = Number(id);
  const { t } = useI18n();

  const { data: platform } = useQuery({
    queryKey: ["platform", platformId],
    queryFn: () => api.getPlatform(platformId),
    enabled: !!platformId,
  });

  const { data: games, isLoading, error } = useQuery({
    queryKey: ["games", { platformId }],
    queryFn: () => api.getGames({ platformId }),
    enabled: !!platformId,
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>{platform?.name ?? t("platformGames.fallbackTitle")}</h1>
        <p>{t("platformGames.inCollection", { count: games?.length ?? 0 })}</p>
      </header>

      {!games?.length ? (
        <div className="empty-state">
          <p>{t("platformGames.empty")}</p>
          <Link to="/games/new" className="btn-primary with-icon" style={{ marginTop: "1rem" }}>
            <LuPlus aria-hidden />
            {t("platformGames.addGame")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {games.map((game) => {
            const cover = getGameCover(game);
            return (
              <Link key={game.id} to={`/games/${game.id}`} className="game-card">
                <div className="game-card-cover">
                  {cover ? (
                    <img src={cover} alt={game.title} />
                  ) : (
                    <span className="placeholder">?</span>
                  )}
                </div>
                <div className="game-card-body">
                  <h3>{game.title}</h3>
                  <div className="meta">
                    {game.region && <span>{game.region} · </span>}
                    {game.condition &&
                      t(`condition.${game.condition as GameCondition}` as MessageKey)}
                  </div>
                  {(game.genres?.length ?? 0) > 0 && (
                    <div className="genre-chip-row game-card-genres">
                      {game.genres!.slice(0, 3).map((genre) => (
                        <span key={genre} className="badge">
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
