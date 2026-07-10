import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { runMigrations } from "./db";
import { ensureDataDirs } from "./lib/storage";
import { gameRoutes } from "./routes/games";
import { platformRoutes } from "./routes/platforms";

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

app.route("/api/platforms", platformRoutes);
app.route("/api/games", gameRoutes);

const port = Number(process.env.PORT ?? 3000);
console.log(`Shellf API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
