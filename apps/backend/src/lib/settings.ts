import {
  DEFAULT_APP_SETTINGS,
  appSettingsDataSchema,
  type AppSettingsData,
  type PublicAppSettings,
  type UpdateAppSettingsInput,
} from "@shellf/shared";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appSettings } from "../db/schema";

export function normalizeSettings(raw: unknown): AppSettingsData {
  const parsed = appSettingsDataSchema.safeParse(raw ?? {});
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_APP_SETTINGS };
}

export async function getAppSettingsData(): Promise<AppSettingsData> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (!row) {
    await db.insert(appSettings).values({
      id: 1,
      data: DEFAULT_APP_SETTINGS,
    });
    return { ...DEFAULT_APP_SETTINGS };
  }
  return normalizeSettings(row.data);
}

export function toPublicSettings(data: AppSettingsData): PublicAppSettings {
  return {
    theme: data.theme,
    locale: data.locale,
    screenscraper: {
      softname: data.screenscraper.softname || "shellf",
      devId: data.screenscraper.devId || process.env.SCREENSCRAPER_DEV_ID || "",
      configured: Boolean(
        data.screenscraper.devPassword || process.env.SCREENSCRAPER_DEV_PASSWORD,
      ),
    },
    emulator: data.emulator ?? {},
  };
}

export async function updateAppSettingsData(
  patch: UpdateAppSettingsInput,
): Promise<AppSettingsData> {
  const current = await getAppSettingsData();
  const nextScreenscraper = {
    ...current.screenscraper,
    ...(patch.screenscraper ?? {}),
  };

  // Empty password on PATCH means "leave unchanged"
  if (
    patch.screenscraper &&
    (patch.screenscraper.devPassword === undefined ||
      patch.screenscraper.devPassword === "")
  ) {
    nextScreenscraper.devPassword = current.screenscraper.devPassword;
  }

  const merged = normalizeSettings({
    theme: patch.theme ?? current.theme,
    locale: patch.locale ?? current.locale,
    screenscraper: nextScreenscraper,
    emulator: patch.emulator !== undefined ? patch.emulator : current.emulator,
  });

  const [existing] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (existing) {
    await db
      .update(appSettings)
      .set({
        data: merged,
        updatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      })
      .where(eq(appSettings.id, 1));
  } else {
    await db.insert(appSettings).values({ id: 1, data: merged });
  }

  return merged;
}
