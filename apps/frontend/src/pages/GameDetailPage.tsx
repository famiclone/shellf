import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  LuArrowLeft,
  LuCamera,
  LuCheck,
  LuDownload,
  LuFileCode,
  LuFileText,
  LuImage,
  LuJoystick,
  LuPlus,
  LuSave,
  LuTrash2,
} from "react-icons/lu";
import { Link, useParams } from "react-router-dom";
import type { GameCondition, MediaType, Region } from "@shellf/shared";
import { EmulatorView } from "../components/EmulatorView";
import { GameActionsMenu } from "../components/GameActionsMenu";
import { GameDownloadMenu } from "../components/GameDownloadMenu";
import { GamePatchesPanel } from "../components/GamePatchesPanel";
import { api, getGameCover } from "../lib/api";
import { useI18n, type MessageKey } from "../lib/i18n";

type AttachedFile = {
  key: string;
  label: string;
  sublabel: string;
  href: string;
  kind: "rom" | MediaType | "patch" | "save";
};
export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const queryClient = useQueryClient();
  const saveInputRef = useRef<HTMLInputElement>(null);
  const [selectedPatchId, setSelectedPatchId] = useState<number | undefined>();
  const [selectedSaveId, setSelectedSaveId] = useState<number | undefined>();
  const [showEmulator, setShowEmulator] = useState(false);
  const [marketPrice, setMarketPrice] = useState("");
  const { t, numberLocale, locale } = useI18n();

  const { data: game, isLoading, error } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api.getGame(gameId),
    enabled: !!gameId,
  });

  const saveMutation = useMutation({
    mutationFn: (file: File) => api.uploadSave(gameId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const deleteSaveMutation = useMutation({
    mutationFn: (saveId: number) => api.deleteSave(gameId, saveId),
    onSuccess: (_, saveId) => {
      if (selectedSaveId === saveId) setSelectedSaveId(undefined);
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });

  const updateMarketPrice = useMutation({
    mutationFn: (price: number) => api.updateGame(gameId, { marketPrice: price }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error || !game) {
    return (
      <p className="error">
        {(error as Error)?.message ?? t("common.gameNotFound")}
      </p>
    );
  }

  const cover = getGameCover(game);
  const canPlay = !!game.romFile && !!game.platform?.emulatorCore;
  const hasPack =
    !!game.romFile ||
    (game.mediaAssets?.length ?? 0) > 0 ||
    (game.patches?.length ?? 0) > 0 ||
    (game.saves?.length ?? 0) > 0;

  const attachedFiles: AttachedFile[] = [];
  if (game.romFile) {
    attachedFiles.push({
      key: `rom-${game.romFile.id}`,
      label: game.romFile.originalFilename,
      sublabel: "ROM",
      href: api.getRomDownloadUrl(gameId, selectedPatchId),
      kind: "rom",
    });
  }
  for (const asset of game.mediaAssets ?? []) {
    attachedFiles.push({
      key: `media-${asset.id}`,
      label: asset.originalFilename,
      sublabel: t(`media.${asset.type}` as MessageKey),
      href: api.getMediaUrl(gameId, asset.id),
      kind: asset.type,
    });
  }
  for (const patch of game.patches ?? []) {
    attachedFiles.push({
      key: `patch-${patch.id}`,
      label: patch.originalFilename || patch.name,
      sublabel: `${t("assets.patches")} · ${patch.format.toUpperCase()}`,
      href: api.getRomDownloadUrl(gameId, patch.id),
      kind: "patch",
    });
  }
  for (const save of game.saves ?? []) {
    attachedFiles.push({
      key: `save-${save.id}`,
      label: save.originalFilename || save.name,
      sublabel: t("assets.saves"),
      href: api.getSaveDownloadUrl(gameId, save.id),
      kind: "save",
    });
  }

  function fileIcon(kind: AttachedFile["kind"]) {
    switch (kind) {
      case "rom":
        return <LuJoystick aria-hidden />;
      case "box":
        return <LuImage aria-hidden />;
      case "photo":
        return <LuCamera aria-hidden />;
      case "manual":
        return <LuFileText aria-hidden />;
      case "patch":
        return <LuFileCode aria-hidden />;
      case "save":
        return <LuSave aria-hidden />;
    }
  }

  return (
    <div>
      <header className="page-header">
        <Link to={`/platforms/${game.platformId}`} className="with-icon" style={{ fontSize: "0.875rem" }}>
          <LuArrowLeft aria-hidden />
          {game.platform?.name}
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
              <div className="empty-state">{t("game.noCover")}</div>
            )}
          </div>

          <div className="cover-actions">
            <GameActionsMenu
              gameId={gameId}
              platformId={game.platformId}
              gameTitle={game.title}
            />
            <GameDownloadMenu
              gameId={gameId}
              patchId={selectedPatchId}
              hasRom={!!game.romFile}
              hasPack={hasPack}
            />
          </div>
        </div>

        <div>
          <div className="game-meta-row">
            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>{t("game.info")}</h3>
              <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem", fontSize: "0.9rem" }}>
                <dt style={{ color: "var(--text-muted)" }}>{t("common.platform")}</dt>
                <dd>{game.platform?.name}</dd>
                {game.region && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.region")}</dt>
                    <dd>{t(`region.${game.region as Region}` as MessageKey)}</dd>
                  </>
                )}
                {game.condition && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.condition")}</dt>
                    <dd>{t(`condition.${game.condition as GameCondition}` as MessageKey)}</dd>
                  </>
                )}
                {(game.genres?.length ?? 0) > 0 && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.genres")}</dt>
                    <dd>
                      <div className="genre-chip-row">
                        {game.genres!.map((genre) => (
                          <span key={genre} className="badge">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </>
                )}
                {game.purchasePrice != null && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.boughtFor")}</dt>
                    <dd>
                      {game.purchasePrice.toLocaleString(numberLocale)} {game.currency ?? "UAH"}
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

            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>{t("game.prices")}</h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>{t("game.marketPrice")}</label>
                  <input
                    type="number"
                    value={marketPrice !== "" ? marketPrice : String(game.scrapedMetadata?.marketPrice ?? "")}
                    onChange={(e) => setMarketPrice(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <button
                  className="btn-secondary with-icon"
                  onClick={() => {
                    const price = Number(marketPrice || game.scrapedMetadata?.marketPrice);
                    if (!isNaN(price)) updateMarketPrice.mutate(price);
                  }}
                >
                  <LuSave aria-hidden />
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>

          {(game.scrapedMetadata?.description) && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>{t("game.description")}</h3>
              <p style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                {game.scrapedMetadata.description}
              </p>
            </div>
          )}

          {attachedFiles.length > 0 && (
            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>{t("game.files")}</h3>
              <div className="file-icon-grid">
                {attachedFiles.map((file) => (
                  <a
                    key={file.key}
                    href={file.href}
                    target="_blank"
                    rel="noreferrer"
                    className="file-icon-tile"
                    title={file.label}
                  >
                    <span className="file-icon-tile__icon">{fileIcon(file.kind)}</span>
                    <span className="file-icon-tile__label">{file.label}</span>
                    <span className="file-icon-tile__meta">{file.sublabel}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="game-play-row">
            <EmulatorView
              gameId={gameId}
              core={game.platform?.emulatorCore ?? ""}
              patchId={selectedPatchId}
              saveId={selectedSaveId}
              locale={locale}
              active={showEmulator}
              canPlay={canPlay}
              onToggle={() => setShowEmulator((v) => !v)}
            />

            <GamePatchesPanel
              gameId={gameId}
              patches={game.patches ?? []}
              selectedPatchId={selectedPatchId}
              onSelectPatchId={setSelectedPatchId}
            />

            <div className="card">
              <div className="section-card-header">
                <h3>{t("game.saves")}</h3>
                <button
                  className="btn-secondary with-icon"
                  onClick={() => saveInputRef.current?.click()}
                >
                  <LuPlus aria-hidden />
                  {t("game.addSave")}
                </button>
                <input
                  ref={saveInputRef}
                  type="file"
                  accept=".srm,.sav"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) saveMutation.mutate(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {game.saves && game.saves.length > 0 ? (
                <ul className="patch-list">
                  {game.saves.map((save) => (
                    <li key={save.id} className="patch-item">
                      <div>
                        <strong>{save.name}</strong>
                        <span className="badge" style={{ marginLeft: "0.5rem" }}>
                          {save.format.toUpperCase()}
                        </span>
                        {selectedSaveId === save.id && (
                          <span className="badge" style={{ marginLeft: "0.5rem" }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          className="btn-secondary with-icon"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                          onClick={() =>
                            setSelectedSaveId(
                              selectedSaveId === save.id ? undefined : save.id,
                            )
                          }
                        >
                          <LuCheck aria-hidden />
                          {t("game.select")}
                        </button>
                        <a
                          href={api.getSaveDownloadUrl(gameId, save.id)}
                          className="btn-secondary with-icon"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                        >
                          <LuDownload aria-hidden />
                          {t("common.download")}
                        </a>
                        <button
                          className="btn-danger with-icon"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                          onClick={() => deleteSaveMutation.mutate(save.id)}
                        >
                          <LuTrash2 aria-hidden />
                          {t("common.delete")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                  {t("game.noSaves")}
                </p>
              )}
              {selectedSaveId && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--accent)" }}>
                  {t("game.saveSelected", { id: selectedSaveId })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
