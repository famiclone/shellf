import { eq, count, sum } from "drizzle-orm";
import { Hono } from "hono";
import {
  createGroupSchema,
  priceForCondition,
  slugify,
  updateGroupSchema,
  type GameCondition,
  type PriceChartingData,
} from "@shellf/shared";
import { db } from "../db";
import { groups, items, kinds, scrapedMetadata } from "../db/schema";

export const groupRoutes = new Hono();

groupRoutes.get("/", async (c) => {
  const kindId = c.req.query("kindId");
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      description: groups.description,
      kindId: groups.kindId,
      emulatorCore: groups.emulatorCore,
      itemCount: count(items.id),
    })
    .from(groups)
    .leftJoin(items, eq(items.groupId, groups.id))
    .groupBy(groups.id);

  const filtered = kindId
    ? rows.filter((r) => r.kindId === Number(kindId))
    : rows;

  return c.json(
    filtered.map((r) => ({
      ...r,
      // backwards-compatible aliases for old platform clients
      shortName: r.slug,
      gameCount: r.itemCount,
    })),
  );
});

groupRoutes.get("/stats/dashboard", async (c) => {
  const totalItems = await db.select({ count: count() }).from(items);
  const totalSpent = await db.select({ total: sum(items.purchasePrice) }).from(items);
  const byGroup = await db
    .select({
      groupId: groups.id,
      name: groups.name,
      count: count(items.id),
      spent: sum(items.purchasePrice),
    })
    .from(groups)
    .leftJoin(items, eq(items.groupId, groups.id))
    .groupBy(groups.id);

  const pricedRows = await db
    .select({
      condition: items.condition,
      pricecharting: scrapedMetadata.pricecharting,
      marketPrice: scrapedMetadata.marketPrice,
    })
    .from(items)
    .leftJoin(scrapedMetadata, eq(scrapedMetadata.itemId, items.id));

  let totalMarketValue = 0;
  let marketPricedItems = 0;
  for (const row of pricedRows) {
    const fromPc = priceForCondition(
      row.pricecharting as PriceChartingData | null,
      row.condition as GameCondition | null,
    );
    const value =
      fromPc ??
      (row.marketPrice != null && Number.isFinite(row.marketPrice)
        ? Number(row.marketPrice)
        : null);
    if (value == null) continue;
    totalMarketValue += value;
    marketPricedItems += 1;
  }

  const byGroupMapped = byGroup.map((p) => ({
    groupId: p.groupId,
    name: p.name,
    count: p.count,
    spent: Number(p.spent ?? 0),
  }));

  return c.json({
    totalItems: totalItems[0]?.count ?? 0,
    totalSpent: Number(totalSpent[0]?.total ?? 0),
    totalMarketValue: Math.round(totalMarketValue * 100) / 100,
    marketPricedItems,
    byGroup: byGroupMapped,
    // backwards-compatible aliases
    totalGames: totalItems[0]?.count ?? 0,
    byPlatform: byGroupMapped.map((p) => ({
      platformId: p.groupId,
      name: p.name,
      count: p.count,
      spent: p.spent,
    })),
  });
});

groupRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [group] = await db.select().from(groups).where(eq(groups.id, id));
  if (!group) return c.json({ error: "Групу не знайдено" }, 404);
  return c.json(group);
});

groupRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const slug = parsed.data.slug || slugify(parsed.data.name);
  const [kind] = await db.select().from(kinds).where(eq(kinds.id, parsed.data.kindId));
  if (!kind) return c.json({ error: "Kind не знайдено" }, 404);

  try {
    const [created] = await db
      .insert(groups)
      .values({
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        kindId: parsed.data.kindId,
        emulatorCore: parsed.data.emulatorCore ?? null,
      })
      .returning();
    return c.json(created, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Помилка створення групи";
    if (message.includes("UNIQUE")) {
      return c.json({ error: "Група з таким slug вже існує" }, 409);
    }
    return c.json({ error: message }, 500);
  }
});

groupRoutes.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  if (parsed.data.kindId != null) {
    const [kind] = await db.select().from(kinds).where(eq(kinds.id, parsed.data.kindId));
    if (!kind) return c.json({ error: "Kind не знайдено" }, 404);
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.slug === "" || parsed.data.slug == null) {
    delete patch.slug;
  }

  const [updated] = await db
    .update(groups)
    .set(patch)
    .where(eq(groups.id, id))
    .returning();

  if (!updated) return c.json({ error: "Групу не знайдено" }, 404);

  // Keep items in sync when group type changes
  if (parsed.data.kindId != null) {
    await db
      .update(items)
      .set({ kindId: parsed.data.kindId })
      .where(eq(items.groupId, id));
  }

  return c.json(updated);
});
