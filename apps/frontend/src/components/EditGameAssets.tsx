import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuCloudDownload,
  LuDownload,
  LuPlus,
  LuRefreshCw,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";
import type { Game, Item, MediaType } from "@shellf/shared";
import { getBoxArtAspectRatio, kindHasFeature } from "@shellf/shared";
import { api, getItemCover } from "../lib/api";
import { BoxArtImage } from "./BoxArtImage";
import { useI18n, type MessageKey } from "../lib/i18n";

type PendingAction =
  | { kind: "rom-delete" }
  | { kind: "cover-delete"; source: "box" | "scraped"; assetId?: number }
  | { kind: "media-delete"; assetId: number; label: string }
  | { kind: "patch-delete"; patchId: number; label: string }
  | { kind: "save-delete"; saveId: number; label: string };

interface EditGameAssetsProps {
  gameId: number;
  game: Item | Game;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditGameAssets({ gameId, game }: EditGameAssetsProps) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [assetError, setAssetError] = useState("");

  const romInputRef = useRef<HTMLInputElement>(null);
  const boxInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const patchInputRef = useRef<HTMLInputElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);
  const replacingMediaIdRef = useRef<number | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["item", gameId] });
  };

  const onAssetError = (err: unknown) => {
    setAssetError((err as Error).message);
  };

  const deleteRomMutation = useMutation({
    mutationFn: () => api.deleteRom(gameId),
    onSuccess: () => {
      setPending(null);
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const uploadRomMutation = useMutation({
    mutationFn: (file: File) => api.uploadRom(gameId, file),
    onSuccess: () => {
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const scrapeMutation = useMutation({
    mutationFn: () => api.scrapeItem(gameId),
    onSuccess: () => {
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (assetId: number) => api.deleteMedia(gameId, assetId),
    onSuccess: () => {
      setPending(null);
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async ({
      file,
      type,
      replace,
      replaceAssetId,
    }: {
      file: File;
      type: MediaType;
      replace?: boolean;
      replaceAssetId?: number;
    }) => {
      if (replaceAssetId) {
        await api.deleteMedia(gameId, replaceAssetId);
      }
      return api.uploadMedia(gameId, file, type, replace);
    },
    onSuccess: () => {
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const deletePatchMutation = useMutation({
    mutationFn: (patchId: number) => api.deletePatch(gameId, patchId),
    onSuccess: () => {
      setPending(null);
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const uploadPatchMutation = useMutation({
    mutationFn: (file: File) => api.uploadPatch(gameId, file),
    onSuccess: () => {
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const deleteSaveMutation = useMutation({
    mutationFn: (saveId: number) => api.deleteSave(gameId, saveId),
    onSuccess: () => {
      setPending(null);
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const uploadSaveMutation = useMutation({
    mutationFn: (file: File) => api.uploadSave(gameId, file),
    onSuccess: () => {
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const clearCoverMutation = useMutation({
    mutationFn: async (opts: {
      source: "box" | "scraped";
      assetId?: number;
    }) => {
      // Cover uses box media first, then scraped URL — clear both so delete
      // does not leave the ScreenScraper image as a fallback.
      if (opts.source === "box" && opts.assetId != null) {
        await api.deleteMedia(gameId, opts.assetId);
      }
      await api.updateItem(gameId, { coverUrl: null });
    },
    onSuccess: () => {
      setPending(null);
      setAssetError("");
      refresh();
    },
    onError: onAssetError,
  });

  const isBusy =
    deleteRomMutation.isPending ||
    uploadRomMutation.isPending ||
    scrapeMutation.isPending ||
    deleteMediaMutation.isPending ||
    uploadMediaMutation.isPending ||
    clearCoverMutation.isPending ||
    deletePatchMutation.isPending ||
    uploadPatchMutation.isPending ||
    deleteSaveMutation.isPending ||
    uploadSaveMutation.isPending;

  function confirmPending() {
    if (!pending) return;
    if (pending.kind === "rom-delete") deleteRomMutation.mutate();
    if (pending.kind === "cover-delete") {
      clearCoverMutation.mutate({
        source: pending.source,
        assetId: pending.assetId,
      });
    }
    if (pending.kind === "media-delete") deleteMediaMutation.mutate(pending.assetId);
    if (pending.kind === "patch-delete") deletePatchMutation.mutate(pending.patchId);
    if (pending.kind === "save-delete") deleteSaveMutation.mutate(pending.saveId);
  }

  const confirmDialog = pending
    ? createPortal(
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={() => !isBusy && setPending(null)}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{t("assets.confirmTitle")}</h3>
            <p>
              {pending.kind === "rom-delete" && t("assets.deleteRom")}
              {pending.kind === "cover-delete" && t("assets.deleteCover")}
              {pending.kind === "media-delete" &&
                t("assets.deleteMedia", { label: pending.label })}
              {pending.kind === "patch-delete" &&
                t("assets.deletePatch", { label: pending.label })}
              {pending.kind === "save-delete" &&
                t("assets.deleteSave", { label: pending.label })}
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={isBusy}
                onClick={() => setPending(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn-danger with-icon"
                disabled={isBusy}
                onClick={confirmPending}
              >
                <LuTrash2 aria-hidden />
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  const mediaByType: Record<MediaType, NonNullable<Item["mediaAssets"]>> = {
    box: game.mediaAssets?.filter((m) => m.type === "box") ?? [],
    photo: game.mediaAssets?.filter((m) => m.type === "photo") ?? [],
    manual: game.mediaAssets?.filter((m) => m.type === "manual") ?? [],
  };

  const features = game.kind?.features;
  const showRom = kindHasFeature(features, "rom");
  const showScrape = kindHasFeature(features, "scrape");
  const showPatches = kindHasFeature(features, "patches");
  const showSaves = kindHasFeature(features, "saves");

  const coverUrl = getItemCover(game);
  const boxCover = mediaByType.box[0];
  const coverSource: "box" | "scraped" | null = boxCover
    ? "box"
    : game.scrapedMetadata?.coverUrl
      ? "scraped"
      : null;
  const coverAspect = getBoxArtAspectRatio(game.group?.slug);

  return (
    <>
      <div className="card edit-assets">
        <h3 style={{ marginBottom: "1rem" }}>{t("assets.files")}</h3>

        <section className="edit-asset-section">
          <h4>{t("assets.cover")}</h4>
          {coverUrl && coverSource ? (
            <div className="edit-cover-row">
              <div
                className="edit-cover-preview"
                style={{ ["--cover-aspect" as string]: coverAspect }}
              >
                <BoxArtImage
                  src={coverUrl}
                  alt={game.title}
                  aspectRatio={coverAspect}
                  rotation={game.coverRotation}
                  layout="intrinsic"
                />
              </div>
              <div className="edit-cover-meta">
                <span>
                  {coverSource === "box"
                    ? t("media.box")
                    : t("assets.coverFromScraper")}
                </span>
                <button
                  type="button"
                  className="btn-danger with-icon"
                  disabled={isBusy}
                  onClick={() =>
                    setPending({
                      kind: "cover-delete",
                      source: coverSource,
                      assetId: boxCover?.id,
                    })
                  }
                >
                  <LuTrash2 aria-hidden />
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ) : (
            <div className="edit-asset-empty">
              <span>{t("assets.noCover")}</span>
              <button
                type="button"
                className="btn-secondary with-icon"
                disabled={isBusy}
                onClick={() => boxInputRef.current?.click()}
              >
                <LuUpload aria-hidden />
                {t("common.upload")}
              </button>
            </div>
          )}
        </section>

        {showRom && (
        <section className="edit-asset-section">
          <h4>ROM</h4>
          {game.romFile ? (
            <div className="edit-asset-row">
              <div className="edit-asset-info">
                <strong>{game.romFile.originalFilename}</strong>
                <span>{formatSize(game.romFile.size)}</span>
              </div>
              <div className="edit-asset-actions">
                <a
                  href={api.getRomDownloadUrl(gameId)}
                  className="btn-secondary with-icon"
                >
                  <LuDownload aria-hidden />
                  {t("common.download")}
                </a>
                {showScrape && (
                <button
                  type="button"
                  className="btn-secondary with-icon"
                  disabled={isBusy}
                  onClick={() => scrapeMutation.mutate()}
                >
                  <LuCloudDownload aria-hidden />
                  {scrapeMutation.isPending
                    ? t("game.syncing")
                    : t("assets.screenscraper")}
                </button>
                )}
                <button
                  type="button"
                  className="btn-secondary with-icon"
                  disabled={isBusy}
                  onClick={() => romInputRef.current?.click()}
                >
                  <LuRefreshCw aria-hidden />
                  {t("common.replace")}
                </button>
                <button
                  type="button"
                  className="btn-danger with-icon"
                  disabled={isBusy}
                  onClick={() => setPending({ kind: "rom-delete" })}
                >
                  <LuTrash2 aria-hidden />
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ) : (
            <div className="edit-asset-empty">
              <span>{t("assets.romMissing")}</span>
              <button
                type="button"
                className="btn-secondary with-icon"
                disabled={isBusy}
                onClick={() => romInputRef.current?.click()}
              >
                <LuUpload aria-hidden />
                {t("common.upload")}
              </button>
            </div>
          )}
          <input
            ref={romInputRef}
            type="file"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadRomMutation.mutate(file);
              event.target.value = "";
            }}
          />
        </section>
        )}

        {(["box", "photo", "manual"] as const).map((type) => {
          const assets = mediaByType[type];
          const inputRef =
            type === "box" ? boxInputRef : type === "photo" ? photoInputRef : manualInputRef;
          const typeLabel = t(`media.${type}` as MessageKey);

          return (
            <section key={type} className="edit-asset-section">
              <h4>{typeLabel}</h4>
              {assets.length > 0 ? (
                <ul className="edit-asset-list">
                  {assets.map((asset) => (
                    <li key={asset.id} className="edit-asset-row">
                      <div className="edit-asset-info">
                        {asset.mimeType.startsWith("image/") && (
                          <img
                            src={api.getMediaUrl(gameId, asset.id)}
                            alt={asset.originalFilename}
                            className="edit-asset-thumb"
                          />
                        )}
                        <div>
                          <strong>{asset.originalFilename}</strong>
                          <span>{typeLabel}</span>
                        </div>
                      </div>
                      <div className="edit-asset-actions">
                        <button
                          type="button"
                          className="btn-secondary with-icon"
                          disabled={isBusy}
                          onClick={() => {
                            replacingMediaIdRef.current = asset.id;
                            inputRef.current?.click();
                          }}
                        >
                          <LuRefreshCw aria-hidden />
                          {t("common.replace")}
                        </button>
                        <button
                          type="button"
                          className="btn-danger with-icon"
                          disabled={isBusy}
                          onClick={() =>
                            setPending({
                              kind: "media-delete",
                              assetId: asset.id,
                              label: asset.originalFilename,
                            })
                          }
                        >
                          <LuTrash2 aria-hidden />
                          {t("common.delete")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="edit-asset-empty">
                  <span>{t("assets.noFiles")}</span>
                </div>
              )}
              {(type === "photo" || assets.length === 0) && (
                <button
                  type="button"
                  className="btn-secondary edit-asset-add with-icon"
                  disabled={isBusy}
                  onClick={() => inputRef.current?.click()}
                >
                  {assets.length === 0 ? (
                    <LuUpload aria-hidden />
                  ) : (
                    <LuPlus aria-hidden />
                  )}
                  {assets.length === 0 ? t("common.upload") : t("common.add")}
                </button>
              )}
              <input
                ref={inputRef}
                type="file"
                hidden
                accept={
                  type === "manual"
                    ? "image/*,application/pdf"
                    : "image/*"
                }
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    const replaceAssetId = replacingMediaIdRef.current ?? undefined;
                    replacingMediaIdRef.current = null;
                    uploadMediaMutation.mutate({
                      file,
                      type,
                      replace: type === "box" && !replaceAssetId,
                      replaceAssetId,
                    });
                  }
                  event.target.value = "";
                }}
              />
            </section>
          );
        })}

        {showPatches && (
        <section className="edit-asset-section">
          <h4>{t("assets.patches")}</h4>
          {game.patches && game.patches.length > 0 ? (
            <ul className="edit-asset-list">
              {game.patches.map((patch) => (
                <li key={patch.id} className="edit-asset-row">
                  <div className="edit-asset-info">
                    <strong>{patch.name}</strong>
                    <span>{patch.format.toUpperCase()}</span>
                  </div>
                  <div className="edit-asset-actions">
                    <button
                      type="button"
                      className="btn-danger with-icon"
                      disabled={isBusy}
                      onClick={() =>
                        setPending({
                          kind: "patch-delete",
                          patchId: patch.id,
                          label: patch.name,
                        })
                      }
                    >
                      <LuTrash2 aria-hidden />
                      {t("common.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="edit-asset-empty">
              <span>{t("assets.noPatches")}</span>
            </div>
          )}
          <button
            type="button"
            className="btn-secondary edit-asset-add with-icon"
            disabled={isBusy}
            onClick={() => patchInputRef.current?.click()}
          >
            <LuPlus aria-hidden />
            {t("assets.addPatch")}
          </button>
          <input
            ref={patchInputRef}
            type="file"
            accept=".ips,.bps"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadPatchMutation.mutate(file);
              event.target.value = "";
            }}
          />
        </section>
        )}

        {showSaves && (
        <section className="edit-asset-section">
          <h4>{t("assets.saves")}</h4>
          {game.saves && game.saves.length > 0 ? (
            <ul className="edit-asset-list">
              {game.saves.map((save) => (
                <li key={save.id} className="edit-asset-row">
                  <div className="edit-asset-info">
                    <strong>{save.name}</strong>
                    <span>
                      {save.format.toUpperCase()} · {formatSize(save.size)}
                    </span>
                  </div>
                  <div className="edit-asset-actions">
                    <a
                      href={api.getSaveDownloadUrl(gameId, save.id)}
                      className="btn-secondary with-icon"
                    >
                      <LuDownload aria-hidden />
                      {t("common.download")}
                    </a>
                    <button
                      type="button"
                      className="btn-danger with-icon"
                      disabled={isBusy}
                      onClick={() =>
                        setPending({
                          kind: "save-delete",
                          saveId: save.id,
                          label: save.name,
                        })
                      }
                    >
                      <LuTrash2 aria-hidden />
                      {t("common.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="edit-asset-empty">
              <span>{t("assets.noSaves")}</span>
            </div>
          )}
          <button
            type="button"
            className="btn-secondary edit-asset-add with-icon"
            disabled={isBusy}
            onClick={() => saveInputRef.current?.click()}
          >
            <LuPlus aria-hidden />
            {t("assets.addSave")}
          </button>
          <input
            ref={saveInputRef}
            type="file"
            accept=".srm,.sav"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadSaveMutation.mutate(file);
              event.target.value = "";
            }}
          />
        </section>
        )}

        {assetError && <p className="error">{assetError}</p>}
      </div>
      {confirmDialog}
    </>
  );
}
