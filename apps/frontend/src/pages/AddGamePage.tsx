import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GAME_CONDITIONS,
  GAME_CONDITION_LABELS,
  REGIONS,
  REGION_LABELS,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api } from "../lib/api";

const STEPS = ["Платформа", "ROM", "Медіа", "Метадані"] as const;

export function AddGamePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [gameId, setGameId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [platformId, setPlatformId] = useState<number | "">("");
  const [region, setRegion] = useState<Region | "">("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currency, setCurrency] = useState("UAH");
  const [condition, setCondition] = useState<GameCondition | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: platforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: api.getPlatforms,
  });

  const createMutation = useMutation({
    mutationFn: api.createGame,
    onSuccess: (game) => {
      setGameId(game.id);
      setStep(1);
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
      api.updateGame(id, data),
    onSuccess: (_, { id }) => navigate(`/games/${id}`),
    onError: (err) => setError((err as Error).message),
  });

  function handleStep0() {
    if (!title || !platformId) {
      setError("Вкажіть назву та платформу");
      return;
    }
    createMutation.mutate({
      title,
      platformId: Number(platformId),
      region: region || null,
      purchasePrice: purchasePrice ? Number(purchasePrice) : null,
      currency,
      condition: condition || null,
      notes: notes || null,
    });
  }

  return (
    <div>
      <header className="page-header">
        <h1>Додати гру</h1>
        <p>Оцифруйте нову покупку в колекцію</p>
      </header>

      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`wizard-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {step === 0 && (
          <>
            <div className="form-group">
              <label>Назва гри</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contra" />
            </div>
            <div className="form-group">
              <label>Платформа</label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Оберіть платформу</option>
                {platforms?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn-primary" onClick={handleStep0} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Створення..." : "Далі"}
            </button>
          </>
        )}

        {step === 1 && gameId && (
          <>
            <div className="form-group">
              <label>ROM файл (дамп)</label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadRomMutation.mutate({ id: gameId, file });
                }}
              />
            </div>
            <div className="actions">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                Пропустити
              </button>
            </div>
          </>
        )}

        {step === 2 && gameId && (
          <>
            <div className="form-group">
              <label>Фото боксу</label>
              <input type="file" accept="image/*" id="box-input" />
            </div>
            <div className="form-group">
              <label>Скан мануалу (PDF або зображення)</label>
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
                    uploadMediaMutation.mutate({ id: gameId, box, manual });
                  } else {
                    setStep(3);
                  }
                }}
                disabled={uploadMediaMutation.isPending}
              >
                {uploadMediaMutation.isPending ? "Завантаження..." : "Далі"}
              </button>
              <button className="btn-secondary" onClick={() => setStep(3)}>
                Пропустити
              </button>
            </div>
          </>
        )}

        {step === 3 && gameId && (
          <>
            <div className="form-group">
              <label>Регіон</label>
              <select value={region} onChange={(e) => setRegion(e.target.value as Region | "")}>
                <option value="">Не вказано</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ціна покупки</label>
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
              <label>Стан</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as GameCondition | "")}
              >
                <option value="">Не вказано</option>
                {GAME_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {GAME_CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Нотатки</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Куплено на Yahoo Auctions, є подряпини на коробці..."
              />
            </div>
            <button
              className="btn-primary"
              onClick={() =>
                updateMutation.mutate({
                  id: gameId,
                  data: {
                    region: region || null,
                    purchasePrice: purchasePrice ? Number(purchasePrice) : null,
                    currency,
                    condition: condition || null,
                    notes: notes || null,
                  },
                })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Збереження..." : "Завершити"}
            </button>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
