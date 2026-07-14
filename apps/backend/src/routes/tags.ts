import { count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createTagSchema, slugify } from "@shellf/shared";
import { db } from "../db";
import { itemTags, tags } from "../db/schema";
import { upsertTagByName } from "../lib/tags";

export const tagRoutes = new Hono();

tagRoutes.get("/", async (c) => {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      itemCount: count(itemTags.itemId),
    })
    .from(tags)
    .leftJoin(itemTags, eq(itemTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(tags.name);

  return c.json(rows);
});

tagRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const slug = slugify(parsed.data.name);
  const existing = await db.query.tags.findFirst({ where: eq(tags.slug, slug) });
  if (existing) {
    return c.json({ error: "Тег з таким ім'ям вже існує", tag: existing }, 409);
  }

  const created = await upsertTagByName(parsed.data.name);
  if (!created) return c.json({ error: "Невірне ім'я тега" }, 400);
  return c.json(created, 201);
});

tagRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [deleted] = await db.delete(tags).where(eq(tags.id, id)).returning();
  if (!deleted) return c.json({ error: "Тег не знайдено" }, 404);
  return c.json({ ok: true });
});
