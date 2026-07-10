import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createKindSchema, slugify, type KindFeatures } from "@shellf/shared";
import { db } from "../db";
import { kinds } from "../db/schema";

export const kindRoutes = new Hono();

kindRoutes.get("/", async (c) => {
  const rows = await db.select().from(kinds);
  return c.json(rows);
});

kindRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createKindSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const slug = parsed.data.slug || slugify(parsed.data.name);
  const features: KindFeatures = parsed.data.features ?? {};

  try {
    const [created] = await db
      .insert(kinds)
      .values({
        name: parsed.data.name,
        slug,
        isSystem: false,
        features,
      })
      .returning();
    return c.json(created, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Помилка створення kind";
    if (message.includes("UNIQUE")) {
      return c.json({ error: "Kind з таким slug вже існує" }, 409);
    }
    return c.json({ error: message }, 500);
  }
});

kindRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [kind] = await db.select().from(kinds).where(eq(kinds.id, id));
  if (!kind) return c.json({ error: "Kind не знайдено" }, 404);
  return c.json(kind);
});
