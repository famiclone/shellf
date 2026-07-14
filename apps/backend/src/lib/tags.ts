import { normalizeTagNames, slugify } from "@shellf/shared";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { itemTags, tags } from "../db/schema";

export async function upsertTagByName(name: string) {
  const normalized = normalizeTagNames([name])[0];
  if (!normalized) return null;
  const slug = slugify(normalized);

  const existing = await db.query.tags.findFirst({
    where: eq(tags.slug, slug),
  });
  if (existing) return existing;

  try {
    const [created] = await db
      .insert(tags)
      .values({ name: normalized, slug })
      .returning();
    return created ?? null;
  } catch {
    // Race: another insert won UNIQUE(slug)
    return (
      (await db.query.tags.findFirst({ where: eq(tags.slug, slug) })) ?? null
    );
  }
}

export async function resolveTagIds(opts: {
  tagIds?: number[] | null;
  tagNames?: string[] | null;
}): Promise<number[]> {
  const ids = new Set<number>();
  for (const id of opts.tagIds ?? []) {
    if (Number.isFinite(id) && id > 0) ids.add(id);
  }
  for (const name of normalizeTagNames(opts.tagNames ?? [])) {
    const tag = await upsertTagByName(name);
    if (tag) ids.add(tag.id);
  }
  return [...ids].slice(0, 20);
}

/** Replace all tags on an item with the given tag IDs. */
export async function syncItemTags(itemId: number, tagIds: number[]) {
  await db.delete(itemTags).where(eq(itemTags.itemId, itemId));
  if (!tagIds.length) return;
  const unique = [...new Set(tagIds)];
  // Ensure tags exist
  const existing = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, unique));
  const valid = new Set(existing.map((t) => t.id));
  const rows = unique.filter((id) => valid.has(id)).map((tagId) => ({ itemId, tagId }));
  if (rows.length) {
    await db.insert(itemTags).values(rows);
  }
}

/** Attach tags by name without removing existing ones. */
export async function attachTagNames(itemId: number, names: string[]) {
  const ids = await resolveTagIds({ tagNames: names });
  if (!ids.length) return;
  const existing = await db
    .select({ tagId: itemTags.tagId })
    .from(itemTags)
    .where(eq(itemTags.itemId, itemId));
  const have = new Set(existing.map((r) => r.tagId));
  const rows = ids
    .filter((id) => !have.has(id))
    .map((tagId) => ({ itemId, tagId }));
  if (rows.length) {
    await db.insert(itemTags).values(rows);
  }
}

export function tagsFromItemRelations(
  itemTagsRows:
    | Array<{ tag: { id: number; name: string; slug: string } | null }>
    | undefined,
) {
  return (itemTagsRows ?? [])
    .map((row) => row.tag)
    .filter((t): t is { id: number; name: string; slug: string } => t != null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function shapeItemWithTags<
  T extends {
    itemTags?: Array<{ tag: { id: number; name: string; slug: string } | null }>;
  },
>(item: T) {
  const { itemTags: links, ...rest } = item;
  const tagList = tagsFromItemRelations(links);
  return {
    ...rest,
    tags: tagList,
    genres: tagList.map((t) => t.name),
  };
}
