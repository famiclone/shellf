import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { KIND_SLUGS } from "@shellf/shared";
import { db } from "../db";
import { kinds } from "../db/schema";

export const kindRoutes = new Hono();

kindRoutes.get("/", async (c) => {
  const rows = await db.select().from(kinds);
  const order = new Map(KIND_SLUGS.map((slug, i) => [slug, i]));
  rows.sort(
    (a, b) =>
      (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99) ||
      a.name.localeCompare(b.name),
  );
  return c.json(rows);
});

kindRoutes.post("/", async (c) => {
  return c.json(
    {
      error:
        "Kinds are fixed (Game, Audio, Video, Card, Book). Assign one when creating a group.",
    },
    403,
  );
});

kindRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [kind] = await db.select().from(kinds).where(eq(kinds.id, id));
  if (!kind) return c.json({ error: "Kind не знайдено" }, 404);
  return c.json(kind);
});
