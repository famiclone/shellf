import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import {
  LuCheck,
  LuDownload,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import type { Patch } from "@shellf/shared";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface GamePatchesPanelProps {
  gameId: number;
  patches: Patch[];
  selectedPatchId?: number;
  onSelectPatchId: (id: number | undefined) => void;
}

export function GamePatchesPanel({
  gameId,
  patches,
  selectedPatchId,
  onSelectPatchId,
}: GamePatchesPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const patchInputRef = useRef<HTMLInputElement>(null);

  const patchMutation = useMutation({
    mutationFn: (file: File) => api.uploadPatch(gameId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game", gameId] }),
  });

  const deletePatchMutation = useMutation({
    mutationFn: (patchId: number) => api.deletePatch(gameId, patchId),
    onSuccess: (_, patchId) => {
      if (selectedPatchId === patchId) onSelectPatchId(undefined);
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });

  return (
    <div className="card">
      <div className="section-card-header">
        <h3>{t("game.patches")}</h3>
        <button
          className="btn-secondary with-icon"
          onClick={() => patchInputRef.current?.click()}
        >
          <LuPlus aria-hidden />
          {t("game.addPatch")}
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

      {patches.length > 0 ? (
        <ul className="patch-list">
          {patches.map((patch) => (
            <li key={patch.id} className="patch-item">
              <div>
                <strong>{patch.name}</strong>
                <span className="badge" style={{ marginLeft: "0.5rem" }}>
                  {patch.format.toUpperCase()}
                </span>
                {selectedPatchId === patch.id && (
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
                    onSelectPatchId(
                      selectedPatchId === patch.id ? undefined : patch.id,
                    )
                  }
                >
                  <LuCheck aria-hidden />
                  {t("game.select")}
                </button>
                <a
                  href={api.getRomDownloadUrl(gameId, patch.id)}
                  className="btn-secondary with-icon"
                  style={{
                    padding: "0.3rem 0.6rem",
                    fontSize: "0.8rem",
                  }}
                >
                  <LuDownload aria-hidden />
                  {t("common.download")}
                </a>
                <button
                  className="btn-danger with-icon"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
                  onClick={() => deletePatchMutation.mutate(patch.id)}
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
          {t("game.noPatches")}
        </p>
      )}
      {selectedPatchId && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--accent)" }}>
          {t("game.patchSelected", { id: selectedPatchId })}
        </p>
      )}
    </div>
  );
}
