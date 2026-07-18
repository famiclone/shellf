import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LuLayoutGrid, LuList, LuPlus } from "react-icons/lu";
import { Link, useSearchParams } from "react-router-dom";
import {
  getBoxArtAspectRatio,
  LEGACY_REGION_MAP,
  type GameCondition,
  type Item,
  type Region,
} from "@shellf/shared";
import { api, getItemCover, getItemTagList } from "../lib/api";
import { BoxArtImage } from "../components/BoxArtImage";
import { PhotoGrid } from "../components/PhotoGrid";
import { useI18n, type MessageKey } from "../lib/i18n";

type ItemsView = "grid" | "list";

const VIEW_STORAGE_KEY = "shellf:items-view";
const GROUP_PREVIEW_LIMIT = 30;

function readStoredView(): ItemsView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function ItemGridCard({ item }: { item: Item }) {
  const { t } = useI18n();
  const cover = getItemCover(item);
  const tagList = getItemTagList(item);
  const coverAspect = getBoxArtAspectRatio(item.group?.slug);

  return (
    <Link to={`/items/${item.id}`} className="game-card">
      <div
        className="game-card-cover"
        style={{ ["--cover-aspect" as string]: coverAspect }}
      >
        {cover ? (
          <BoxArtImage
            src={cover}
            alt={item.title}
            aspectRatio={coverAspect}
            rotation={item.coverRotation}
            layout="intrinsic"
          />
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
}

function ItemListRow({ item }: { item: Item }) {
  const { t } = useI18n();
  const cover = getItemCover(item);
  const tagList = getItemTagList(item);
  const coverAspect = getBoxArtAspectRatio(item.group?.slug);

  return (
    <Link to={`/items/${item.id}`} className="items-list-row">
      <div className="items-list-thumb">
        {cover ? (
          <BoxArtImage
            src={cover}
            alt=""
            aspectRatio={coverAspect}
            rotation={item.coverRotation}
          />
        ) : (
          <span className="placeholder">?</span>
        )}
      </div>
      <div className="items-list-body">
        <div className="items-list-title">{item.title}</div>
        <div className="meta">
          {item.region && (
            <span>
              {t(
                `region.${(LEGACY_REGION_MAP[item.region] ?? item.region) as Region}` as MessageKey,
              )}
            </span>
          )}
          {item.region && item.condition && <span> · </span>}
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
            {tagList.slice(0, 4).map((tag) => (
              <span key={tag.slug ?? tag.name} className="badge">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function ItemsPage() {
  const { t, numberLocale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag") ?? "";
  const [view, setView] = useState<ItemsView>(() => readStoredView());

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // ignore
    }
  }, [view]);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: api.getTags,
  });

  const { data: items, isLoading, error } = useQuery({
    queryKey: ["items", { tag: activeTag || undefined }],
    queryFn: () => api.getItems(activeTag ? { tag: activeTag } : undefined),
  });

  const filterTags = useMemo(
    () => (tags ?? []).filter((tag) => (tag.itemCount ?? 0) > 0 || tag.slug === activeTag),
    [tags, activeTag],
  );

  const groupedItems = useMemo(() => {
    const map = new Map<
      number,
      {
        groupId: number;
        name: string;
        items: NonNullable<typeof items>;
        purchaseByCurrency: Map<string, number>;
      }
    >();

    for (const item of items ?? []) {
      const groupId = item.groupId;
      const name = item.group?.name ?? `#${groupId}`;
      let existing = map.get(groupId);
      if (!existing) {
        existing = {
          groupId,
          name,
          items: [],
          purchaseByCurrency: new Map(),
        };
        map.set(groupId, existing);
      }
      existing.items.push(item);
      if (item.purchasePrice != null && Number.isFinite(item.purchasePrice)) {
        const currency = item.currency?.trim() || "UAH";
        existing.purchaseByCurrency.set(
          currency,
          (existing.purchaseByCurrency.get(currency) ?? 0) + item.purchasePrice,
        );
      }
    }

    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [items]);

  function selectTag(slug: string) {
    if (!slug || slug === activeTag) {
      setSearchParams({});
      return;
    }
    setSearchParams({ tag: slug });
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
        <div className="items-toolbar">
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
          <div className="view-toggle" role="group" aria-label={t("items.view")}>
            <button
              type="button"
              className={`view-toggle-btn ${view === "grid" ? "active" : ""}`}
              title={t("items.viewGrid")}
              aria-label={t("items.viewGrid")}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LuLayoutGrid aria-hidden />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${view === "list" ? "active" : ""}`}
              title={t("items.viewList")}
              aria-label={t("items.viewList")}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <LuList aria-hidden />
            </button>
          </div>
        </div>
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
        <div className="items-by-group">
          {groupedItems.map((section) => {
            const purchaseParts = [...section.purchaseByCurrency.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(
                ([currency, total]) =>
                  `${total.toLocaleString(numberLocale)} ${currency}`,
              );
            const purchaseLabel =
              purchaseParts.length > 0 ? purchaseParts.join(" · ") : null;
            const visibleItems = section.items.slice(0, GROUP_PREVIEW_LIMIT);
            const hiddenCount = section.items.length - visibleItems.length;

            return (
              <section key={section.groupId} className="items-group-section">
                <div className="items-group-header">
                  <h2 className="items-group-title">
                    <Link to={`/groups/${section.groupId}`}>{section.name}</Link>
                  </h2>
                  <p className="items-group-meta">
                    {section.items.length}
                    {purchaseLabel ? ` (${purchaseLabel})` : ""}
                  </p>
                </div>
                {view === "grid" ? (
                  <PhotoGrid>
                    {visibleItems.map((item) => (
                      <ItemGridCard key={item.id} item={item} />
                    ))}
                  </PhotoGrid>
                ) : (
                  <div className="items-list">
                    {visibleItems.map((item) => (
                      <ItemListRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
                {hiddenCount > 0 && (
                  <Link
                    to={`/groups/${section.groupId}`}
                    className="items-group-more"
                  >
                    {t("items.showAllInGroup", { count: section.items.length })}
                  </Link>
                )}
              </section>
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
