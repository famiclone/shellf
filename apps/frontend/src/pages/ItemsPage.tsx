import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { Link, useSearchParams } from "react-router-dom";
import {
  getBoxArtAspectRatio,
  LEGACY_REGION_MAP,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api, getItemCover, getItemTagList } from "../lib/api";
import { BoxArtImage } from "../components/BoxArtImage";
import { useI18n, type MessageKey } from "../lib/i18n";

export function ItemsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag") ?? "";
  const [newTagName, setNewTagName] = useState("");
  const [createError, setCreateError] = useState("");

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.getTags,
  });

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["items", { tag: activeTag || undefined }],
    queryFn: () => api.getItems(activeTag ? { tag: activeTag } : undefined),
  });

  const createTagMutation = useMutation({
    mutationFn: api.createTag,
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setNewTagName("");
      setCreateError("");
      setSearchParams({ tag: tag.slug });
    },
    onError: (err) => setCreateError((err as Error).message),
  });

  const filterTags = useMemo(
    () => (tags ?? []).filter((tag) => (tag.itemCount ?? 0) > 0 || tag.slug === activeTag),
    [tags, activeTag],
  );

  function selectTag(slug: string) {
    if (!slug || slug === activeTag) {
      setSearchParams({});
      return;
    }
    setSearchParams({ tag: slug });
  }

  function handleCreateTag(event: React.FormEvent) {
    event.preventDefault();
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim() });
  }

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  return (
    <div>
      <header className="page-header">
        <h1>{t("items.title")}</h1>
        <p>{t("items.subtitle", { count: items?.length ?? 0 })}</p>
      </header>

      <div className="tag-filter-bar">
        <div className="genre-chip-row">
          <button
            type="button"
            className={`genre-chip ${!activeTag ? "active" : ""}`}
            onClick={() => selectTag("")}
          >
            {t("items.allTags")}
          </button>
          {filterTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`genre-chip ${activeTag === tag.slug ? "active" : ""}`}
              onClick={() => selectTag(tag.slug)}
            >
              {tag.name}
              {tag.itemCount != null ? ` (${tag.itemCount})` : ""}
            </button>
          ))}
        </div>
        <form className="genre-add-row" onSubmit={handleCreateTag}>
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder={t("items.createTag")}
          />
          <button
            type="submit"
            className="btn-secondary with-icon"
            disabled={!newTagName.trim() || createTagMutation.isPending}
          >
            <LuPlus aria-hidden />
            {t("common.add")}
          </button>
        </form>
        {createError && <p className="error">{createError}</p>}
      </div>

      {!items?.length ? (
        <div className="empty-state">
          <p>{activeTag ? t("items.emptyTag") : t("items.empty")}</p>
          <Link to="/items/new" className="btn-primary with-icon" style={{ marginTop: "1rem" }}>
            <LuPlus aria-hidden />
            {t("nav.addGame")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {items.map((item) => {
            const cover = getItemCover(item);
            const tagList = getItemTagList(item);
            const coverAspect = getBoxArtAspectRatio(item.group?.slug);
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
                  {item.group?.name && (
                    <div className="meta" style={{ marginBottom: "0.25rem" }}>
                      {item.group.name}
                    </div>
                  )}
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

/** Compact tag filter used on group pages. */
export function TagFilterChips({
  activeTag,
  onSelect,
  tags,
}: {
  activeTag: string;
  onSelect: (slug: string) => void;
  tags: Array<{ id: number; name: string; slug: string; itemCount?: number }>;
}) {
  const { t } = useI18n();
  if (!tags.length) return null;
  return (
    <div className="tag-filter-bar tag-filter-bar--compact">
      <div className="genre-chip-row">
        <button
          type="button"
          className={`genre-chip ${!activeTag ? "active" : ""}`}
          onClick={() => onSelect("")}
        >
          {t("items.allTags")}
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`genre-chip ${activeTag === tag.slug ? "active" : ""}`}
            onClick={() => onSelect(tag.slug === activeTag ? "" : tag.slug)}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
