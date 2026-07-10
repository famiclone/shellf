import { eq, count, sum } from "drizzle-orm";
import { Hono } from "hono";
import { createPlatformSchema } from "@shellf/shared";
import { db } from "../db";
import { games, platforms } from "../db/schema";

export const platformRoutes = new Hono();

platformRoutes.get("/", async (c) => {
  const rows = await db
    .select({
      id: platforms.id,
      name: platforms.name,
      shortName: platforms.shortName,
      emulatorCore: platforms.emulatorCore,
      description: platforms.description,
      gameCount: count(games.id),
    })
    .from(platforms)
    .leftJoin(games, eq(games.platformId, platforms.id))
    .groupBy(platforms.id);

  return c.json(rows);
});

platformRoutes.get("/stats/dashboard", async (c) => {
  const totalGames = await db.select({ count: count() }).from(games);
  const totalSpent = await db.select({ total: sum(games.purchasePrice) }).from(games);
  const byPlatform = await db
    .select({
      platformId: platforms.id,
      name: platforms.name,
      count: count(games.id),
      spent: sum(games.purchasePrice),
    })
    .from(platforms)
    .leftJoin(games, eq(games.platformId, platforms.id))
    .groupBy(platforms.id);

  return c.json({
    totalGames: totalGames[0]?.count ?? 0,
    totalSpent: Number(totalSpent[0]?.total ?? 0),
    byPlatform: byPlatform.map((p) => ({
      platformId: p.platformId,
      name: p.name,
      count: p.count,
      spent: Number(p.spent ?? 0),
    })),
  });
});

platformRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [platform] = await db.select().from(platforms).where(eq(platforms.id, id));
  if (!platform) return c.json({ error: "Платформу не знайдено" }, 404);
  return c.json(platform);
});

platformRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createPlatformSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [created] = await db.insert(platforms).values(parsed.data).returning();
  return c.json(created, 201);
});
