import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { GAME_CONDITION_LABELS, type GameCondition } from "@shellf/shared";
import { api, getGameCover } from "../lib/api";

export function PlatformGamesPage() {
  const { id } = useParams<{ id: string }>();
  const platformId = Number(id);

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

  if (isLoading) return <p>Завантаження...</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>{platform?.name ?? "Платформа"}</h1>
        <p>{games?.length ?? 0} ігор у колекції</p>
      </header>

      {!games?.length ? (
        <div className="empty-state">
          <p>Ще немає ігор на цій платформі</p>
          <Link to="/games/new" className="btn-primary" style={{ display: "inline-block", marginTop: "1rem" }}>
            Додати гру
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
                      GAME_CONDITION_LABELS[game.condition as GameCondition]}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
