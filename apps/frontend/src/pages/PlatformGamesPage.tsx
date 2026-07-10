import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { LuPlus } from "react-icons/lu";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getBoxArtAspectRatio,
  LEGACY_REGION_MAP,
  type GameCondition,
  type Region,
} from "@shellf/shared";
import { api, getItemCover, getItemTagList } from "../lib/api";
import { useI18n, type MessageKey } from "../lib/i18n";
import { TagFilterChips } from "./ItemsPage";

export function PlatformGamesPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get("tag") ?? "";

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api.getGroup(groupId),
    enabled: !!groupId,
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

  const groupTags = useMemo(() => {
    const map = new Map<string, { id: number; name: string; slug: string }>();
    for (const item of items ?? []) {
      for (const tag of item.tags ?? []) {
        map.set(tag.slug, tag);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // When filtering, still show chips from unfiltered set — fetch all group items for chips once
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
    // keep active even if empty result
    if (activeTag && !map.has(activeTag)) {
      map.set(activeTag, { id: -1, name: activeTag, slug: activeTag });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allGroupItems, items, activeTag]);

  if (isLoading) return <p>{t("common.loading")}</p>;
  if (error) return <p className="error">{(error as Error).message}</p>;

  const coverAspect = getBoxArtAspectRatio(group?.slug);

  return (
    <div>
      <header className="page-header">
        <h1>{group?.name ?? t("platformGames.fallbackTitle")}</h1>
        <p>{t("platformGames.inCollection", { count: items?.length ?? 0 })}</p>
      </header>

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
                    <img src={cover} alt={item.title} />
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
