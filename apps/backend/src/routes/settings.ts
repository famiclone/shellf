import { updateAppSettingsSchema } from "@shellf/shared";
import { Hono } from "hono";
import {
  getAppSettingsData,
  toPublicSettings,
  updateAppSettingsData,
} from "../lib/settings";

export const settingsRoutes = new Hono();

settingsRoutes.get("/", async (c) => {
  const data = await getAppSettingsData();
  return c.json(toPublicSettings(data));
});

settingsRoutes.patch("/", async (c) => {
  const body = await c.req.json();
  const parsed = updateAppSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = await updateAppSettingsData(parsed.data);
  return c.json(toPublicSettings(data));
});
