import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuPlus, LuSave, LuX } from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  GAME_CONDITIONS,
  TAG_PRESETS,
  REGIONS,
  LEGACY_REGION_MAP,
  normalizeTagNames,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api, getItemTagList } from "../lib/api";
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
  const [isPirate, setIsPirate] = useState(false);
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");

  const { data: game, isLoading, error: loadError } = useQuery({
    queryKey: ["item", gameId],
    queryFn: () => api.getItem(gameId),
    enabled: !!gameId,
  });

  const { data: allTags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.getTags,
  });

  useEffect(() => {
    if (!game) return;
    setTitle(game.title);
    setRegion(
      game.region
        ? ((LEGACY_REGION_MAP[game.region] ?? game.region) as Region | "")
        : "",
    );
    setPurchasePrice(game.purchasePrice != null ? String(game.purchasePrice) : "");
    setCurrency(game.currency ?? "UAH");
    setCondition(game.condition ?? "");
    setIsPirate(Boolean(game.isPirate));
    setNotes(game.notes ?? "");
    setDescription(game.scrapedMetadata?.description ?? "");
    setTagNames(normalizeTagNames(getItemTagList(game).map((t) => t.name)));
  }, [game]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateItem(gameId, {
        title,
        region: region || null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        currency,
        condition: condition || null,
        isPirate,
        notes: notes || null,
        description: description.trim() ? description.trim() : null,
        tags: normalizeTagNames(tagNames),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", gameId] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      navigate(`/items/${gameId}`);
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

  function toggleTag(tag: string) {
    setTagNames((prev) => {
      const key = tag.toLowerCase();
      const exists = prev.some((g) => g.toLowerCase() === key);
      if (exists) return prev.filter((g) => g.toLowerCase() !== key);
      return normalizeTagNames([...prev, tag]);
    });
  }

  function addCustomTag() {
    const next = normalizeTagNames([...tagNames, customTag]);
    setTagNames(next);
    setCustomTag("");
  }

  const selectedKeys = new Set(tagNames.map((g) => g.toLowerCase()));
  const suggestionNames = [
    ...TAG_PRESETS,
    ...(allTags ?? []).map((t) => t.name),
  ].filter(
    (name, index, arr) =>
      arr.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === index,
  );

  return (
    <div>
      <header className="page-header">
        <Link to={`/items/${gameId}`} className="with-icon" style={{ fontSize: "0.875rem" }}>
          <LuArrowLeft aria-hidden />
          {game.title}
        </Link>
        <h1>{t("editGame.title")}</h1>
      </header>

      <div className="edit-game-layout">
        <form className="card edit-game-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("editGame.titleLabel")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t("editGame.platformLabel")}</label>
            <input value={game.group?.name ?? ""} disabled />
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
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPirate}
                onChange={(e) => setIsPirate(e.target.checked)}
              />
              {t("editGame.isPirate")}
            </label>
          </div>
          <div className="form-group">
            <label>{t("editGame.tags")}</label>
            <p className="settings-hint" style={{ marginBottom: "0.65rem" }}>
              {t("editGame.tagsHint")}
            </p>
            <div className="genre-chip-row">
              {suggestionNames.map((preset) => {
                const active = selectedKeys.has(preset.toLowerCase());
                return (
                  <button
                    key={preset}
                    type="button"
                    className={`genre-chip ${active ? "active" : ""}`}
                    aria-pressed={active}
                    onClick={() => toggleTag(preset)}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
            {tagNames.some(
              (g) => !suggestionNames.some((p) => p.toLowerCase() === g.toLowerCase()),
            ) && (
              <div className="genre-chip-row" style={{ marginTop: "0.5rem" }}>
                {tagNames
                  .filter(
                    (g) => !suggestionNames.some((p) => p.toLowerCase() === g.toLowerCase()),
                  )
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="genre-chip active with-icon"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                      <LuX aria-hidden />
                    </button>
                  ))}
              </div>
            )}
            <div className="genre-add-row">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder={t("editGame.tagsAdd")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary with-icon"
                onClick={addCustomTag}
                disabled={!customTag.trim()}
              >
                <LuPlus aria-hidden />
                {t("common.add")}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>{t("game.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder={t("editGame.descriptionHint")}
            />
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
            <Link to={`/items/${gameId}`} className="btn-secondary">
              {t("common.cancel")}
            </Link>
          </div>
          {error && <p className="error">{error}</p>}
        </form>

        <EditGameAssets gameId={gameId} game={game} />
      </div>
    </div>
  );
}
