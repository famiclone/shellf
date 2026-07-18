import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { runMigrations } from "./db";
import { ensureDataDirs } from "./lib/storage";
import { groupRoutes } from "./routes/groups";
import { itemRoutes } from "./routes/items";
import { kindRoutes } from "./routes/kinds";
import { settingsRoutes } from "./routes/settings";
import { tagRoutes } from "./routes/tags";

ensureDataDirs();
runMigrations();

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/kinds", kindRoutes);
app.route("/api/groups", groupRoutes);
app.route("/api/tags", tagRoutes);
app.route("/api/items", itemRoutes);
app.route("/api/settings", settingsRoutes);

/** @deprecated Prefer /api/groups */
app.route("/api/platforms", groupRoutes);
/** @deprecated Prefer /api/items */
app.route("/api/games", itemRoutes);

const port = Number(process.env.PORT ?? 3100);
console.log(`Shellf API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
