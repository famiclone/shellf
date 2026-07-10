import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  LuArrowLeft,
  LuCamera,
  LuCheck,
  LuDownload,
  LuExternalLink,
  LuFileCode,
  LuFileText,
  LuImage,
  LuJoystick,
  LuPlus,
  LuRefreshCw,
  LuSave,
  LuTrash2,
} from "react-icons/lu";
import { Link, useParams } from "react-router-dom";
import type { GameCondition, MediaType, Region } from "@shellf/shared";
import {
  getBoxArtAspectRatio,
  kindHasFeature,
  LEGACY_REGION_MAP,
  pricechartingKeyForCondition,
  type PriceChartingPriceKey,
} from "@shellf/shared";
import { EmulatorView } from "../components/EmulatorView";
import { GameActionsMenu } from "../components/GameActionsMenu";
import { GameDownloadMenu } from "../components/GameDownloadMenu";
import { GamePatchesPanel } from "../components/GamePatchesPanel";
import { api, getItemCover, getItemTagList } from "../lib/api";
import { useI18n, type MessageKey } from "../lib/i18n";

type AttachedFile = {
  key: string;
  label: string;
  sublabel: string;
  href: string;
  kind: "rom" | MediaType | "patch" | "save";
  previewUrl?: string;
};

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const queryClient = useQueryClient();
  const saveInputRef = useRef<HTMLInputElement>(null);
  const [selectedPatchId, setSelectedPatchId] = useState<number | undefined>();
  const [selectedSaveId, setSelectedSaveId] = useState<number | undefined>();
  const [showEmulator, setShowEmulator] = useState(false);
  const [priceSyncError, setPriceSyncError] = useState("");
  const { t, numberLocale, locale } = useI18n();

  const { data: game, isLoading, error } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => api.getItem(itemId),
    enabled: !!itemId,
  });

  const saveMutation = useMutation({
    mutationFn: (file: File) => api.uploadSave(itemId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["item", itemId] }),
  });

  const deleteSaveMutation = useMutation({
    mutationFn: (saveId: number) => api.deleteSave(itemId, saveId),
    onSuccess: (_, saveId) => {
      if (selectedSaveId === saveId) setSelectedSaveId(undefined);
      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
    },
  });

  const syncPrices = useMutation({
    mutationFn: () => api.syncItemPrices(itemId),
    onSuccess: () => {
      setPriceSyncError("");
      queryClient.invalidateQueries({ queryKey: ["item", itemId] });
    },
    onError: (err) => setPriceSyncError((err as Error).message),
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error || !game) {
    return (
      <p className="error">
        {(error as Error)?.message ?? t("common.gameNotFound")}
      </p>
    );
  }

  const features = game.kind?.features;
  const hasRom = kindHasFeature(features, "rom");
  const hasEmulator = kindHasFeature(features, "emulator");
  const hasPatches = kindHasFeature(features, "patches");
  const hasSaves = kindHasFeature(features, "saves");

  const group = game.group;
  const cover = getItemCover(game);
  const coverAspect = getBoxArtAspectRatio(group?.slug);
  const canPlay = hasEmulator && hasRom && !!game.romFile && !!group?.emulatorCore;
  const hasPack =
    !!game.romFile ||
    (game.mediaAssets?.length ?? 0) > 0 ||
    (game.patches?.length ?? 0) > 0 ||
    (game.saves?.length ?? 0) > 0;

  const attachedFiles: AttachedFile[] = [];
  if (hasRom && game.romFile) {
    attachedFiles.push({
      key: `rom-${game.romFile.id}`,
      label: game.romFile.originalFilename,
      sublabel: "ROM",
      href: api.getRomDownloadUrl(itemId, selectedPatchId),
      kind: "rom",
    });
  }
  for (const asset of game.mediaAssets ?? []) {
    const href = api.getMediaUrl(itemId, asset.id);
    attachedFiles.push({
      key: `media-${asset.id}`,
      label: asset.originalFilename,
      sublabel: t(`media.${asset.type}` as MessageKey),
      href,
      kind: asset.type,
      previewUrl: asset.mimeType.startsWith("image/") ? href : undefined,
    });
  }
  if (hasPatches) {
    for (const patch of game.patches ?? []) {
      attachedFiles.push({
        key: `patch-${patch.id}`,
        label: patch.originalFilename || patch.name,
        sublabel: `${t("assets.patches")} · ${patch.format.toUpperCase()}`,
        href: api.getRomDownloadUrl(itemId, patch.id),
        kind: "patch",
      });
    }
  }
  if (hasSaves) {
    for (const save of game.saves ?? []) {
      attachedFiles.push({
        key: `save-${save.id}`,
        label: save.originalFilename || save.name,
        sublabel: t("assets.saves"),
        href: api.getSaveDownloadUrl(itemId, save.id),
        kind: "save",
      });
    }
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
        <Link to={`/groups/${game.groupId}`} className="with-icon" style={{ fontSize: "0.875rem" }}>
          <LuArrowLeft aria-hidden />
          {group?.name}
        </Link>
        <h1>{game.title}</h1>
        {game.scrapedMetadata?.title && game.scrapedMetadata.title !== game.title && (
          <p>{game.scrapedMetadata.title}</p>
        )}
      </header>

      <div className="game-detail">
        <div>
          <div
            className="cover-large"
            style={{ ["--cover-aspect" as string]: coverAspect }}
          >
            {cover ? (
              <img src={cover} alt={game.title} />
            ) : (
              <div className="empty-state">{t("game.noCover")}</div>
            )}
          </div>

          <div className="cover-actions">
            <GameActionsMenu
              gameId={itemId}
              groupId={game.groupId}
              gameTitle={game.title}
            />
            <GameDownloadMenu
              gameId={itemId}
              patchId={selectedPatchId}
              hasRom={hasRom && !!game.romFile}
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
                <dd>{group?.name}</dd>
                {game.kind && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("common.kind")}</dt>
                    <dd>{game.kind.name}</dd>
                  </>
                )}
                {game.region && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.region")}</dt>
                    <dd>
                      {t(
                        `region.${(LEGACY_REGION_MAP[game.region] ?? game.region) as Region}` as MessageKey,
                      )}
                    </dd>
                  </>
                )}
                {game.condition && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.condition")}</dt>
                    <dd>{t(`condition.${game.condition as GameCondition}` as MessageKey)}</dd>
                  </>
                )}
                <dt style={{ color: "var(--text-muted)" }}>{t("game.isPirate")}</dt>
                <dd>
                  {game.isPirate ? (
                    <span className="badge badge-pirate">{t("game.pirateYes")}</span>
                  ) : (
                    t("game.pirateNo")
                  )}
                </dd>
                {(getItemTagList(game).length > 0) && (
                  <>
                    <dt style={{ color: "var(--text-muted)" }}>{t("game.tags")}</dt>
                    <dd>
                      <div className="genre-chip-row">
                        {getItemTagList(game).map((tag) => (
                          <Link
                            key={tag.slug ?? tag.name}
                            to={tag.slug ? `/items?tag=${encodeURIComponent(tag.slug)}` : "/items"}
                            className="badge"
                          >
                            {tag.name}
                          </Link>
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
                {hasRom && game.romFile && (
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
              <div className="section-card-header" style={{ marginBottom: "0.75rem" }}>
                <h3 style={{ margin: 0 }}>{t("game.prices")}</h3>
                <button
                  type="button"
                  className="btn-secondary with-icon"
                  disabled={syncPrices.isPending}
                  onClick={() => syncPrices.mutate()}
                >
                  <LuRefreshCw aria-hidden />
                  {syncPrices.isPending ? t("game.priceSyncing") : t("game.priceSync")}
                </button>
              </div>

              {priceSyncError && (
                <p className="error" style={{ marginBottom: "0.75rem" }}>
                  {priceSyncError}
                </p>
              )}

              {(() => {
                const pc = game.scrapedMetadata?.pricecharting;
                if (!pc) return null;
                const activeKey = pricechartingKeyForCondition(
                  game.condition as GameCondition | null,
                );
                const rows: Array<{
                  key: PriceChartingPriceKey;
                  label: string;
                  value: number | null;
                }> = [
                  {
                    key: "loose",
                    label: t("game.priceLoose"),
                    value: pc.loose,
                  },
                  { key: "cib", label: t("game.priceCib"), value: pc.cib },
                  {
                    key: "newPrice",
                    label: t("game.priceNew"),
                    value: pc.newPrice,
                  },
                  {
                    key: "boxOnly",
                    label: t("game.priceBoxOnly"),
                    value: pc.boxOnly,
                  },
                  {
                    key: "manualOnly",
                    label: t("game.priceManualOnly"),
                    value: pc.manualOnly ?? null,
                  },
                ];
                return (
                  <div style={{ marginBottom: "1rem" }}>
                    <div className="price-condition-list">
                      {rows.map((row) => {
                        const active = activeKey === row.key;
                        return (
                          <div
                            key={row.key}
                            className={`price-condition-row${active ? " is-active" : ""}`}
                          >
                            <span className="price-condition-row__label">
                              {row.label}
                              {active && (
                                <span className="badge price-condition-row__badge">
                                  {t("game.priceYourCondition")}
                                </span>
                              )}
                            </span>
                            <span className="price-condition-row__value">
                              {row.value != null
                                ? `$${row.value.toLocaleString(numberLocale, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem 1rem",
                        marginTop: "0.65rem",
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <a
                        href={pc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="with-icon"
                      >
                        <LuExternalLink aria-hidden />
                        {t("game.priceOpen")}
                      </a>
                      <span>
                        {t("game.priceSyncedAt", {
                          date: new Date(pc.syncedAt).toLocaleString(numberLocale),
                        })}
                      </span>
                    </div>
                    {pc.productName && (
                      <p
                        style={{
                          margin: "0.35rem 0 0",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {pc.productName}
                        {pc.consoleName ? ` · ${pc.consoleName}` : ""}
                      </p>
                    )}
                  </div>
                );
              })()}
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
                    className={`file-icon-tile${file.previewUrl ? " file-icon-tile--preview" : ""}`}
                    title={file.label}
                  >
                    {file.previewUrl ? (
                      <span className="file-icon-tile__preview">
                        <img src={file.previewUrl} alt={file.label} />
                      </span>
                    ) : (
                      <span className="file-icon-tile__icon">{fileIcon(file.kind)}</span>
                    )}
                    <span className="file-icon-tile__label">{file.label}</span>
                    <span className="file-icon-tile__meta">{file.sublabel}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="game-play-row">
            {hasEmulator && (
              <EmulatorView
                itemId={itemId}
                core={group?.emulatorCore ?? ""}
                patchId={selectedPatchId}
                saveId={selectedSaveId}
                locale={locale}
                active={showEmulator}
                canPlay={canPlay}
                onToggle={() => setShowEmulator((v) => !v)}
              />
            )}

            {hasPatches && (
              <GamePatchesPanel
                gameId={itemId}
                patches={game.patches ?? []}
                selectedPatchId={selectedPatchId}
                onSelectPatchId={setSelectedPatchId}
              />
            )}

            {hasSaves && (
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
                            href={api.getSaveDownloadUrl(itemId, save.id)}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
