import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GAME_CONDITION_LABELS,
  REGION_LABELS,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { EmulatorView } from "../components/EmulatorView";
import { api, getGameCover } from "../lib/api";

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const queryClient = useQueryClient();
  const patchInputRef = useRef<HTMLInputElement>(null);
  const [selectedPatchId, setSelectedPatchId] = useState<number | undefined>();
  const [showEmulator, setShowEmulator] = useState(false);
  const [marketPrice, setMarketPrice] = useState("");

  const { data: game, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api.getGame(gameId),
    enabled: !!gameId,
  });

  const scrapeMutation = useMutation({
    mutationFn: () => api.scrapeGame(gameId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const patchMutation = useMutation({
    mutationFn: (file: File) => api.uploadPatch(gameId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const deletePatchMutation = useMutation({
    mutationFn: (patchId: number) => api.deletePatch(gameId, patchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const updateMarketPrice = useMutation({
    mutationFn: (price: number) => api.updateGame(gameId, { marketPrice: price }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  if (isLoading) return <p>Завантаження...</p>;
  if (error || !game) return <p className="error">{(error as Error)?.message ?? "Гру не знайдено"}</p>;

  const cover = getGameCover(game);
  const boxMedia = game.mediaAssets?.filter((m) => m.type === "box" || m.type === "photo") ?? [];
  const manualMedia = game.mediaAssets?.filter((m) => m.type === "manual") ?? [];
  const canPlay = !!game.romFile && !!game.platform?.emulatorCore;

  return (
    <div>
      <header className="page-header">
        <Link to={`/platforms/${game.platformId}`} style={{ fontSize: "0.875rem" }}>
          ← {game.platform?.name}
        </Link>
        <h1>{game.title}</h1>
        {game.scrapedMetadata?.title && game.scrapedMetadata.title !== game.title && (
          <p>{game.scrapedMetadata.title}</p>
        )}
      </header>

      <div className="game-detail">
        <div>
          <div className="cover-large">
            {cover ? (
              <img src={cover} alt={game.title} />
            ) : (
              <div className="empty-state">Немає обкладинки</div>
            )}
          </div>

          {boxMedia.length > 0 && (
            <div className="media-gallery">
              {boxMedia.map((m) => (
                <a
                  key={m.id}
                  href={api.getMediaUrl(gameId, m.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="media-thumb"
                >
                  <img src={api.getMediaUrl(gameId, m.id)} alt={m.type} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Інформація</h3>
            <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem", fontSize: "0.9rem" }}>
              <dt style={{ color: "var(--text-muted)" }}>Платформа</dt>
              <dd>{game.platform?.name}</dd>
              {game.region && (
                <>
                  <dt style={{ color: "var(--text-muted)" }}>Регіон</dt>
                  <dd>{REGION_LABELS[game.region as Region] ?? game.region}</dd>
                </>
              )}
              {game.condition && (
                <>
                  <dt style={{ color: "var(--text-muted)" }}>Стан</dt>
                  <dd>{GAME_CONDITION_LABELS[game.condition as GameCondition]}</dd>
                </>
              )}
              {game.purchasePrice != null && (
                <>
                  <dt style={{ color: "var(--text-muted)" }}>Куплено за</dt>
                  <dd>
                    {game.purchasePrice.toLocaleString("uk-UA")} {game.currency ?? "UAH"}
                  </dd>
                </>
              )}
              {game.romFile && (
                <>
                  <dt style={{ color: "var(--text-muted)" }}>ROM</dt>
                  <dd style={{ fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
                    CRC: {game.romFile.crc32}
                  </dd>
                </>
              )}
            </dl>

            {game.notes && (
              <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                {game.notes}
              </p>
            )}
          </div>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Ціни</h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Ринкова ціна (ручна)</label>
                <input
                  type="number"
                  value={marketPrice !== "" ? marketPrice : String(game.scrapedMetadata?.marketPrice ?? "")}
                  onChange={(e) => setMarketPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  const price = Number(marketPrice || game.scrapedMetadata?.marketPrice);
                  if (!isNaN(price)) updateMarketPrice.mutate(price);
                }}
              >
                Зберегти
              </button>
            </div>
          </div>

          {(game.scrapedMetadata?.description || scrapeMutation.isPending) && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>Опис</h3>
              {scrapeMutation.isPending ? (
                <p>Завантаження з ScreenScraper...</p>
              ) : (
                <p style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                  {game.scrapedMetadata?.description}
                </p>
              )}
            </div>
          )}

          {manualMedia.length > 0 && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>Мануал</h3>
              {manualMedia.map((m) =>
                m.mimeType === "application/pdf" ? (
                  <iframe
                    key={m.id}
                    src={api.getMediaUrl(gameId, m.id)}
                    style={{ width: "100%", height: 400, border: "none", borderRadius: 8 }}
                    title="Мануал"
                  />
                ) : (
                  <img
                    key={m.id}
                    src={api.getMediaUrl(gameId, m.id)}
                    alt="Мануал"
                    style={{ maxWidth: "100%", borderRadius: 8 }}
                  />
                ),
              )}
            </div>
          )}

          <div className="actions">
            {canPlay && (
              <button className="btn-primary" onClick={() => setShowEmulator(!showEmulator)}>
                {showEmulator ? "Сховати емулятор" : "Грати"}
              </button>
            )}
            {game.romFile && (
              <a
                href={api.getRomDownloadUrl(gameId, selectedPatchId)}
                className="btn-secondary"
                style={{ display: "inline-block", textAlign: "center" }}
              >
                Завантажити ROM
              </a>
            )}
            {game.romFile && (
              <button
                className="btn-secondary"
                onClick={() => scrapeMutation.mutate()}
                disabled={scrapeMutation.isPending}
              >
                {scrapeMutation.isPending ? "Синхронізація..." : "ScreenScraper"}
              </button>
            )}
          </div>

          {scrapeMutation.isError && (
            <p className="error">{(scrapeMutation.error as Error).message}</p>
          )}

          {showEmulator && canPlay && (
            <EmulatorView
              gameId={gameId}
              core={game.platform!.emulatorCore!}
              patchId={selectedPatchId}
            />
          )}

          <div className="card" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Патчі (ROM hacks)</h3>
              <button
                className="btn-secondary"
                onClick={() => patchInputRef.current?.click()}
              >
                Додати патч
              </button>
              <input
                ref={patchInputRef}
                type="file"
                accept=".ips,.bps"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) patchMutation.mutate(file);
                  e.target.value = "";
                }}
              />
            </div>

            {game.patches && game.patches.length > 0 ? (
              <ul className="patch-list">
                {game.patches.map((patch) => (
                  <li key={patch.id} className="patch-item">
                    <div>
                      <strong>{patch.name}</strong>
                      <span className="badge" style={{ marginLeft: "0.5rem" }}>
                        {patch.format.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                        onClick={() => setSelectedPatchId(patch.id)}
                      >
                        Обрати
                      </button>
                      <a
                        href={api.getRomDownloadUrl(gameId, patch.id)}
                        className="btn-secondary"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", display: "inline-block" }}
                      >
                        Завантажити
                      </a>
                      <button
                        className="btn-danger"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                        onClick={() => deletePatchMutation.mutate(patch.id)}
                      >
                        Видалити
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Немає патчів. Завантажте IPS або BPS файл.
              </p>
            )}
            {selectedPatchId && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--accent)" }}>
                Обрано патч #{selectedPatchId} — буде використано для гри та завантаження
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
