import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GAME_CONDITIONS,
  kindHasFeature,
  REGIONS,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api } from "../lib/api";
import { useI18n, type MessageKey } from "../lib/i18n";

export function AddGamePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [itemId, setItemId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState<number | "">("");
  const [region, setRegion] = useState<Region | "">("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currency, setCurrency] = useState("UAH");
  const [condition, setCondition] = useState<GameCondition | "">("");
  const [isPirate, setIsPirate] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: () => api.getGroups(),
  });

  const { data: kinds } = useQuery({
    queryKey: ["kinds"],
    queryFn: api.getKinds,
  });

  const selectedGroup = groups?.find((g) => g.id === groupId);
  const selectedKind =
    (selectedGroup?.kindId
      ? kinds?.find((k) => k.id === selectedGroup.kindId)
      : undefined) ?? kinds?.find((k) => k.slug === "game");
  const hasRomFeature = kindHasFeature(selectedKind?.features, "rom");

  const steps = useMemo(() => {
    const list = [
      { key: "group", label: t("addGame.step.platform") },
      ...(hasRomFeature ? [{ key: "rom", label: t("addGame.step.rom") }] : []),
      { key: "media", label: t("addGame.step.media") },
      { key: "metadata", label: t("addGame.step.metadata") },
    ];
    return list;
  }, [hasRomFeature, t]);

  const createMutation = useMutation({
    mutationFn: api.createItem,
    onSuccess: (item) => {
      setItemId(item.id);
      setStep(hasRomFeature ? 1 : 2);
      setError("");
    },
    onError: (err) => setError((err as Error).message),
  });

  const uploadRomMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => api.uploadRom(id, file),
    onSuccess: () => {
      setStep(2);
      setError("");
    },
    onError: (err) => setError((err as Error).message),
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async ({
      id,
      box,
      manual,
    }: {
      id: number;
      box?: File;
      manual?: File;
    }) => {
      if (box) await api.uploadMedia(id, box, "box");
      if (manual) await api.uploadMedia(id, manual, "manual");
    },
    onSuccess: () => {
      setStep(3);
      setError("");
    },
    onError: (err) => setError((err as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.updateItem(id, data),
    onSuccess: (_, { id }) => navigate(`/items/${id}`),
    onError: (err) => setError((err as Error).message),
  });

  function handleStep0() {
    if (!title || !groupId) {
      setError(t("addGame.errorTitlePlatform"));
      return;
    }
    createMutation.mutate({
      title,
      groupId: Number(groupId),
      region: region || null,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      currency,
      condition: condition || null,
      notes: notes || null,
    });
  }

  const activeStepKey =
    step === 0 ? "group" : step === 1 ? "rom" : step === 2 ? "media" : "metadata";

  return (
    <div>
      <header className="page-header">
        <h1>{t("addGame.title")}</h1>
        <p>{t("addGame.subtitle")}</p>
      </header>

      <div className="wizard-steps">
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`wizard-step ${s.key === activeStepKey ? "active" : ""} ${
              steps.findIndex((x) => x.key === activeStepKey) > i ? "done" : ""
            }`}
          >
            {i + 1}. {s.label}
          </span>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {step === 0 && (
          <>
            <div className="form-group">
              <label>{t("addGame.titleLabel")}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contra" />
            </div>
            <div className="form-group">
              <label>{t("addGame.platformLabel")}</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">{t("addGame.selectPlatform")}</option>
                {groups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary" onClick={handleStep0} disabled={createMutation.isPending}>
              {createMutation.isPending ? t("addGame.creating") : t("common.next")}
            </button>
          </>
        )}

        {step === 1 && itemId && hasRomFeature && (
          <>
            <div className="form-group">
              <label>{t("addGame.romLabel")}</label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadRomMutation.mutate({ id: itemId, file });
                }}
              />
            </div>
            <div className="actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                {t("common.skip")}
              </button>
            </div>
          </>
        )}

        {step === 2 && itemId && (
          <>
            <div className="form-group">
              <label>{t("addGame.boxLabel")}</label>
              <input type="file" accept="image/*" id="box-input" />
            </div>
            <div className="form-group">
              <label>{t("addGame.manualLabel")}</label>
              <input type="file" accept="image/*,application/pdf" id="manual-input" />
            </div>
            <div className="actions">
              <button
                className="btn-primary"
                onClick={() => {
                  const box = (document.getElementById("box-input") as HTMLInputElement)
                    .files?.[0];
                  const manual = (document.getElementById("manual-input") as HTMLInputElement)
                    .files?.[0];
                  if (box || manual) {
                    uploadMediaMutation.mutate({ id: itemId, box, manual });
                  } else {
                    setStep(3);
                  }
                }}
                disabled={uploadMediaMutation.isPending}
              >
                {uploadMediaMutation.isPending ? t("addGame.uploading") : t("common.next")}
              </button>
              <button className="btn-secondary" onClick={() => setStep(3)}>
                {t("common.skip")}
              </button>
            </div>
          </>
        )}

        {step === 3 && itemId && (
          <>
            <div className="form-group">
              <label>{t("addGame.region")}</label>
              <select value={region} onChange={(e) => setRegion(e.target.value as Region | "")}>
                <option value="">{t("common.notSpecified")}</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`region.${r}` as MessageKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t("addGame.purchasePrice")}</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  style={{ flex: 1 }}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ width: 80 }}
                >
                  <option value="UAH">UAH</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>{t("addGame.condition")}</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as GameCondition | "")}
              >
                <option value="">{t("common.notSpecified")}</option>
                {GAME_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {t(`condition.${c}` as MessageKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPirate}
                  onChange={(e) => setIsPirate(e.target.checked)}
                />
                {t("addGame.isPirate")}
              </label>
            </div>
            <div className="form-group">
              <label>{t("addGame.notes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("addGame.notesPlaceholder")}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() =>
                updateMutation.mutate({
                  id: itemId,
                  data: {
                    region: region || null,
                    purchasePrice: purchasePrice ? Number(purchasePrice) : null,
                    currency,
                    condition: condition || null,
                    isPirate,
                    notes: notes || null,
                  },
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? t("common.saving") : t("addGame.finish")}
            </button>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
