import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LuPencil, LuPlus, LuSave, LuX } from "react-icons/lu";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getBoxArtAspectRatio,
  LEGACY_REGION_MAP,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api, getItemCover, getItemTagList } from "../lib/api";
import { BoxArtImage } from "../components/BoxArtImage";
import { useI18n, type MessageKey } from "../lib/i18n";
import { TagFilterChips } from "./ItemsPage";

export function PlatformGamesPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag") ?? "";

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [kindId, setKindId] = useState<number | "">("");
  const [emulatorCore, setEmulatorCore] = useState("");
  const [formError, setFormError] = useState("");

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api.getGroup(groupId),
    enabled: !!groupId,
  });

  const { data: kinds } = useQuery({
    queryKey: ["kinds"],
    queryFn: api.getKinds,
  });

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["items", { groupId, tag: activeTag || undefined }],
    queryFn: () =>
      api.getItems({
        groupId,
        ...(activeTag ? { tag: activeTag } : {}),
      }),
    enabled: !!groupId,
  });

  useEffect(() => {
    if (!group || editing) return;
    setName(group.name);
    setKindId(group.kindId ?? "");
    setEmulatorCore(group.emulatorCore ?? "");
  }, [group, editing]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateGroup(groupId, {
        name: name.trim(),
        kindId: Number(kindId),
        emulatorCore: emulatorCore.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditing(false);
      setFormError("");
    },
    onError: (err) => setFormError((err as Error).message),
  });

  const groupTags = useMemo(() => {
    const map = new Map<string, { id: number; name: string; slug: string }>();
    for (const item of items ?? []) {
      for (const tag of item.tags ?? []) {
        map.set(tag.slug, tag);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const { data: allGroupItems } = useQuery({
    queryKey: ["items", { groupId, forTags: true }],
    queryFn: () => api.getItems({ groupId }),
    enabled: !!groupId,
  });

  const chipTags = useMemo(() => {
    const map = new Map<string, { id: number; name: string; slug: string }>();
    for (const item of allGroupItems ?? items ?? []) {
      for (const tag of item.tags ?? []) {
        map.set(tag.slug, tag);
      }
    }
    if (activeTag && !map.has(activeTag)) {
      map.set(activeTag, { id: -1, name: activeTag, slug: activeTag });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroupItems, items, activeTag]);

  function startEdit() {
    if (!group) return;
    setName(group.name);
    setKindId(group.kindId ?? "");
    setEmulatorCore(group.emulatorCore ?? "");
    setFormError("");
    setEditing(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setFormError(t("platforms.createErrorName"));
      return;
    }
    if (kindId === "") {
      setFormError(t("platforms.createErrorKind"));
      return;
    }
    updateMutation.mutate();
  }

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  const coverAspect = getBoxArtAspectRatio(group?.slug);
  const kindName = kinds?.find((k) => k.id === group?.kindId)?.name;

  return (
    <div>
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>{group?.name ?? t("platformGames.fallbackTitle")}</h1>
          <p>
            {kindName ? `${kindName} · ` : ""}
            {t("platformGames.inCollection", { count: items?.length ?? 0 })}
          </p>
        </div>
        <div className="actions">
          {!editing && (
            <button type="button" className="btn-secondary with-icon" onClick={startEdit}>
              <LuPencil aria-hidden />
              {t("platformGames.edit")}
            </button>
          )}
          <Link to="/items/new" className="btn-primary with-icon">
            <LuPlus aria-hidden />
            {t("platformGames.addGame")}
          </Link>
        </div>
      </header>

      {editing && (
        <form className="card" style={{ maxWidth: 520, marginBottom: "1.5rem" }} onSubmit={handleSave}>
          <div className="form-group">
            <label>{t("platforms.createName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("platforms.createNamePlaceholder")}
            />
          </div>
          <div className="form-group">
            <label>{t("platforms.createKind")}</label>
            <select
              value={kindId}
              onChange={(e) => setKindId(e.target.value ? Number(e.target.value) : "")}
              required
            >
              <option value="">{t("platforms.createKindRequired")}</option>
              {kinds?.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {kind.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t("platforms.createEmulatorCore")}</label>
            <input
              value={emulatorCore}
              onChange={(e) => setEmulatorCore(e.target.value)}
              placeholder="nes"
            />
          </div>
          <div className="actions">
            <button
              type="submit"
              className="btn-primary with-icon"
              disabled={updateMutation.isPending}
            >
              <LuSave aria-hidden />
              {updateMutation.isPending ? t("common.saving") : t("common.save")}
            </button>
            <button
              type="button"
              className="btn-secondary with-icon"
              onClick={() => {
                setEditing(false);
                setFormError("");
              }}
              disabled={updateMutation.isPending}
            >
              <LuX aria-hidden />
              {t("common.cancel")}
            </button>
          </div>
          {formError && <p className="error">{formError}</p>}
        </form>
      )}

      <TagFilterChips
        activeTag={activeTag}
        tags={chipTags.length ? chipTags : groupTags}
        onSelect={(slug) => {
          if (!slug) setSearchParams({});
          else setSearchParams({ tag: slug });
        }}
      />

      {!items?.length ? (
        <div className="empty-state">
          <p>{activeTag ? t("items.emptyTag") : t("platformGames.empty")}</p>
          <Link to="/items/new" className="btn-primary with-icon" style={{ marginTop: "1rem" }}>
            <LuPlus aria-hidden />
            {t("platformGames.addGame")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {items.map((item) => {
            const cover = getItemCover(item);
            const tagList = getItemTagList(item);
            return (
              <Link key={item.id} to={`/items/${item.id}`} className="game-card">
                <div
                  className="game-card-cover"
                  style={{ ["--cover-aspect" as string]: coverAspect }}
                >
                  {cover ? (
                    <BoxArtImage src={cover} alt={item.title} aspectRatio={coverAspect} />
                  ) : (
                    <span className="placeholder">?</span>
                  )}
                </div>
                <div className="game-card-body">
                  <h3>{item.title}</h3>
                  <div className="meta">
                    {item.region && (
                      <span>
                        {t(
                          `region.${(LEGACY_REGION_MAP[item.region] ?? item.region) as Region}` as MessageKey,
                        )}{" "}
                        ·{" "}
                      </span>
                    )}
                    {item.condition &&
                      t(`condition.${item.condition as GameCondition}` as MessageKey)}
                    {item.isPirate && (
                      <span className="badge badge-pirate" style={{ marginLeft: "0.35rem" }}>
                        {t("game.pirateBadge")}
                      </span>
                    )}
                  </div>
                  {tagList.length > 0 && (
                    <div className="genre-chip-row game-card-genres">
                      {tagList.slice(0, 3).map((tag) => (
                        <span key={tag.slug ?? tag.name} className="badge">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
