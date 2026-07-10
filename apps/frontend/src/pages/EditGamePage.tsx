import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPlus, LuSave, LuX } from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  GAME_CONDITIONS,
  GENRE_PRESETS,
  REGIONS,
  normalizeGenres,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api } from "../lib/api";
import { EditGameAssets } from "../components/EditGameAssets";
import { useI18n, type MessageKey } from "../lib/i18n";

export function EditGamePage() {
  const { id } = useParams<{ id: string }>();
  const gameId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [region, setRegion] = useState<Region | "">("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currency, setCurrency] = useState("UAH");
  const [condition, setCondition] = useState<GameCondition | "">("");
  const [notes, setNotes] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState("");
  const [error, setError] = useState("");

  const { data: game, isLoading, error: loadError } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => api.getGame(gameId),
    enabled: !!gameId,
  });

  useEffect(() => {
    if (!game) return;
    setTitle(game.title);
    setRegion(game.region ?? "");
    setPurchasePrice(game.purchasePrice != null ? String(game.purchasePrice) : "");
    setCurrency(game.currency ?? "UAH");
    setCondition(game.condition ?? "");
    setNotes(game.notes ?? "");
    setGenres(normalizeGenres(game.genres ?? []));
    setMarketPrice(
      game.scrapedMetadata?.marketPrice != null
        ? String(game.scrapedMetadata.marketPrice)
        : "",
    );
  }, [game]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateGame(gameId, {
        title,
        region: region || null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        currency,
        condition: condition || null,
        notes: notes || null,
        genres: normalizeGenres(genres),
        marketPrice: marketPrice ? Number(marketPrice) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      navigate(`/games/${gameId}`);
    },
    onError: (err) => setError((err as Error).message),
  });

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (loadError || !game) {
    return (
      <p className="error">
        {(loadError as Error)?.message ?? t("common.gameNotFound")}
      </p>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError(t("editGame.errorTitle"));
      return;
    }
    setError("");
    updateMutation.mutate();
  }

  function toggleGenre(tag: string) {
    setGenres((prev) => {
      const key = tag.toLowerCase();
      const exists = prev.some((g) => g.toLowerCase() === key);
      if (exists) return prev.filter((g) => g.toLowerCase() !== key);
      return normalizeGenres([...prev, tag]);
    });
  }

  function addCustomGenre() {
    const next = normalizeGenres([...genres, customGenre]);
    setGenres(next);
    setCustomGenre("");
  }

  const selectedKeys = new Set(genres.map((g) => g.toLowerCase()));

  return (
    <div>
      <header className="page-header">
        <Link to={`/games/${gameId}`} className="with-icon" style={{ fontSize: "0.875rem" }}>
          <LuArrowLeft aria-hidden />
          {game.title}
        </Link>
        <h1>{t("editGame.title")}</h1>
      </header>

      <form className="card" style={{ maxWidth: 520 }} onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t("editGame.titleLabel")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>{t("editGame.platformLabel")}</label>
          <input value={game.platform?.name ?? ""} disabled />
        </div>
        <div className="form-group">
          <label>{t("editGame.region")}</label>
          <select value={region} onChange={(e) => setRegion(e.target.value as Region | "")}>
            <option value="">{t("common.notSpecified")}</option>
            {REGIONS.map((value) => (
              <option key={value} value={value}>
                {t(`region.${value}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t("editGame.purchasePrice")}</label>
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
          <label>{t("editGame.marketPrice")}</label>
          <input
            type="number"
            value={marketPrice}
            onChange={(e) => setMarketPrice(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="form-group">
          <label>{t("editGame.condition")}</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as GameCondition | "")}
          >
            <option value="">{t("common.notSpecified")}</option>
            {GAME_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {t(`condition.${value}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t("editGame.genres")}</label>
          <p className="settings-hint" style={{ marginBottom: "0.65rem" }}>
            {t("editGame.genresHint")}
          </p>
          <div className="genre-chip-row">
            {GENRE_PRESETS.map((preset) => {
              const active = selectedKeys.has(preset.toLowerCase());
              return (
                <button
                  key={preset}
                  type="button"
                  className={`genre-chip ${active ? "active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleGenre(preset)}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          {genres.some((g) => !GENRE_PRESETS.some((p) => p.toLowerCase() === g.toLowerCase())) && (
            <div className="genre-chip-row" style={{ marginTop: "0.5rem" }}>
              {genres
                .filter((g) => !GENRE_PRESETS.some((p) => p.toLowerCase() === g.toLowerCase()))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="genre-chip active with-icon"
                    onClick={() => toggleGenre(tag)}
                  >
                    {tag}
                    <LuX aria-hidden />
                  </button>
                ))}
            </div>
          )}
          <div className="genre-add-row">
            <input
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              placeholder={t("editGame.genresAdd")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomGenre();
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary with-icon"
              onClick={addCustomGenre}
              disabled={!customGenre.trim()}
            >
              <LuPlus aria-hidden />
              {t("common.add")}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>{t("editGame.notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </div>
        <div className="actions">
          <button className="btn-primary with-icon" type="submit" disabled={updateMutation.isPending}>
            <LuSave aria-hidden />
            {updateMutation.isPending ? t("common.saving") : t("common.save")}
          </button>
          <Link to={`/games/${gameId}`} className="btn-secondary">
            {t("common.cancel")}
          </Link>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      <EditGameAssets gameId={gameId} game={game} />
    </div>
  );
}
