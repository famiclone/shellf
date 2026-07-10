import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { basename, extname } from "node:path";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import {
  createGameSchema,
  updateGameSchema,
  type MediaType,
  PATCH_FORMATS,
} from "@shellf/shared";
import { db } from "../db";
import {
  games,
  mediaAssets,
  patches,
  platforms,
  romFiles,
  scrapedMetadata,
} from "../db/schema";
import { computeRomHashes } from "../lib/hashes";
import { applyPatch, detectPatchFormat, PatchError } from "../lib/patcher";
import { lookupByHash } from "../lib/screenscraper";
import {
  ensureParentDir,
  fileExists,
  mediaPath,
  patchPath,
  patchedCachePath,
  relativeToData,
  resolveFromData,
  romPath,
} from "../lib/storage";

function sanitizeFilenamePart(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

function patchedRomFilename(originalFilename: string, patchName: string): string {
  const ext = extname(originalFilename) || ".bin";
  const base = basename(originalFilename, ext);
  const safeBase = sanitizeFilenamePart(base) || "ROM";
  const safePatch = sanitizeFilenamePart(patchName) || "patch";
  return `${safeBase}_(${safePatch})${ext}`;
}

const gameInclude = {
  platform: true as const,
  romFile: true as const,
  mediaAssets: true as const,
  patches: true as const,
  scrapedMetadata: true as const,
};

async function getGameOr404(id: number) {
  return db.query.games.findFirst({
    where: eq(games.id, id),
    with: gameInclude,
  });
}

export const gameRoutes = new Hono();

gameRoutes.get("/", async (c) => {
  const platformId = c.req.query("platformId");
  const search = c.req.query("search");

  const allGames = await db.query.games.findMany({
    where: platformId
      ? (g, { eq: eqFn }) => eqFn(g.platformId, Number(platformId))
      : undefined,
    with: {
      platform: true,
      romFile: true,
      mediaAssets: true,
      scrapedMetadata: true,
    },
    orderBy: (g, { desc }) => [desc(g.updatedAt)],
  });

  const filtered = search
    ? allGames.filter((g) =>
        g.title.toLowerCase().includes(search.toLowerCase()),
      )
    : allGames;

  return c.json(filtered);
});

gameRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);
  return c.json(game);
});

gameRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [platform] = await db
    .select()
    .from(platforms)
    .where(eq(platforms.id, parsed.data.platformId));
  if (!platform) return c.json({ error: "Платформу не знайдено" }, 404);

  const [created] = await db
    .insert(games)
    .values({
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    })
    .returning();

  const game = await getGameOr404(created!.id);
  return c.json(game, 201);
});

gameRoutes.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = updateGameSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { marketPrice, ...gameData } = parsed.data;

  const [updated] = await db
    .update(games)
    .set({ ...gameData, updatedAt: new Date().toISOString() })
    .where(eq(games.id, id))
    .returning();

  if (!updated) return c.json({ error: "Гру не знайдено" }, 404);

  if (marketPrice !== undefined) {
    const existing = await db.query.scrapedMetadata.findFirst({
      where: eq(scrapedMetadata.gameId, id),
    });
    if (existing) {
      await db
        .update(scrapedMetadata)
        .set({
          marketPrice,
          marketPriceSyncedAt: new Date().toISOString(),
        })
        .where(eq(scrapedMetadata.gameId, id));
    } else {
      await db.insert(scrapedMetadata).values({
        gameId: id,
        marketPrice,
        marketPriceSyncedAt: new Date().toISOString(),
      });
    }
  }

  const game = await getGameOr404(id);
  return c.json(game);
});

gameRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [deleted] = await db.delete(games).where(eq(games.id, id)).returning();
  if (!deleted) return c.json({ error: "Гру не знайдено" }, 404);
  return c.json({ ok: true });
});

gameRoutes.post("/:id/rom", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "Файл ROM обов'язковий" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hashes = computeRomHashes(buffer);
  const filename = file.name || "rom.bin";
  const dest = romPath(game.platformId, id, filename);
  ensureParentDir(dest);
  writeFileSync(dest, buffer);

  const relative = relativeToData(dest);
  const existing = game.romFile;
  if (existing) {
    await db
      .update(romFiles)
      .set({
        storagePath: relative,
        originalFilename: filename,
        ...hashes,
      })
      .where(eq(romFiles.gameId, id));
  } else {
    await db.insert(romFiles).values({
      gameId: id,
      storagePath: relative,
      originalFilename: filename,
      ...hashes,
    });
  }

  await db
    .update(games)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(games.id, id));

  const updated = await getGameOr404(id);
  return c.json(updated);
});

gameRoutes.post("/:id/media", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file");
  const type = formData.get("type") as MediaType | null;
  if (!(file instanceof File)) {
    return c.json({ error: "Файл обов'язковий" }, 400);
  }
  if (!type || !["box", "manual", "photo"].includes(type)) {
    return c.json({ error: "Невірний тип медіа" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || `${type}.bin`;
  const dest = mediaPath(id, filename);
  ensureParentDir(dest);
  writeFileSync(dest, buffer);

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      gameId: id,
      type,
      storagePath: relativeToData(dest),
      mimeType: file.type || "application/octet-stream",
      originalFilename: filename,
    })
    .returning();

  await db
    .update(games)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(games.id, id));

  return c.json(asset, 201);
});

gameRoutes.get("/:id/media/:assetId", async (c) => {
  const gameId = Number(c.req.param("id"));
  const assetId = Number(c.req.param("assetId"));
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId));

  if (!asset || asset.gameId !== gameId) {
    return c.json({ error: "Медіа не знайдено" }, 404);
  }

  const fullPath = resolveFromData(asset.storagePath);
  if (!fileExists(fullPath)) {
    return c.json({ error: "Файл не знайдено на диску" }, 404);
  }

  const data = readFileSync(fullPath);
  return new Response(data, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${asset.originalFilename}"`,
    },
  });
});

async function getRomBuffer(
  gameId: number,
  patchId?: number,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const game = await getGameOr404(gameId);
  if (!game?.romFile) {
    throw new Error("ROM_NOT_FOUND");
  }

  const romFullPath = resolveFromData(game.romFile.storagePath);
  const romBuffer = readFileSync(romFullPath);
  const ext = extname(game.romFile.originalFilename) || ".bin";

  if (!patchId) {
    return {
      buffer: romBuffer,
      filename: game.romFile.originalFilename,
      mimeType: "application/octet-stream",
    };
  }

  const [patch] = await db
    .select()
    .from(patches)
    .where(eq(patches.id, patchId));
  if (!patch || patch.gameId !== gameId) {
    throw new Error("PATCH_NOT_FOUND");
  }

  const patchedFilename = patchedRomFilename(game.romFile.originalFilename, patch.name);

  const cachePath = patchedCachePath(gameId, patchId, ext);
  if (fileExists(cachePath)) {
    return {
      buffer: readFileSync(cachePath),
      filename: patchedFilename,
      mimeType: "application/octet-stream",
    };
  }

  const patchBuffer = readFileSync(resolveFromData(patch.storagePath));
  const patched = applyPatch(
    romBuffer,
    patchBuffer,
    patch.format as (typeof PATCH_FORMATS)[number],
  );
  ensureParentDir(cachePath);
  writeFileSync(cachePath, patched);

  return {
    buffer: patched,
    filename: patchedFilename,
    mimeType: "application/octet-stream",
  };
}

gameRoutes.get("/:id/rom", async (c) => {
  const id = Number(c.req.param("id"));
  const patchId = c.req.query("patchId")
    ? Number(c.req.query("patchId"))
    : undefined;
  const inline = c.req.query("inline") === "1";

  try {
    const { buffer, filename, mimeType } = await getRomBuffer(id, patchId);
    const safeName = filename.replace(/"/g, "'");
    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": inline
          ? `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
          : `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    if (err instanceof PatchError) {
      return c.json({ error: err.message }, 422);
    }
    const message = err instanceof Error ? err.message : "Помилка";
    if (message === "ROM_NOT_FOUND") {
      return c.json({ error: "ROM не завантажено" }, 404);
    }
    if (message === "PATCH_NOT_FOUND") {
      return c.json({ error: "Патч не знайдено" }, 404);
    }
    throw err;
  }
});

gameRoutes.get("/:id/play", async (c) => {
  const id = Number(c.req.param("id"));
  const patchId = c.req.query("patchId");
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);
  if (!game.platform?.emulatorCore) {
    return c.json({ error: "Емулятор для цієї платформи недоступний" }, 400);
  }

  const url = patchId
    ? `/api/games/${id}/rom?patchId=${patchId}`
    : `/api/games/${id}/rom`;

  return c.json({
    romUrl: url,
    core: game.platform.emulatorCore,
    title: game.title,
  });
});

gameRoutes.get("/:id/patches", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select().from(patches).where(eq(patches.gameId, id));
  return c.json(list);
});

gameRoutes.post("/:id/patches", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file");
  const name = (formData.get("name") as string) || undefined;
  if (!(file instanceof File)) {
    return c.json({ error: "Файл патчу обов'язковий" }, 400);
  }

  const format = detectPatchFormat(file.name);
  if (!format) {
    return c.json({ error: "Підтримуються лише IPS та BPS патчі" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const dest = patchPath(id, filename);
  ensureParentDir(dest);
  writeFileSync(dest, buffer);

  const [created] = await db
    .insert(patches)
    .values({
      gameId: id,
      name: name || basename(filename, extname(filename)),
      format,
      storagePath: relativeToData(dest),
      originalFilename: filename,
    })
    .returning();

  return c.json(created, 201);
});

gameRoutes.delete("/:id/patches/:patchId", async (c) => {
  const gameId = Number(c.req.param("id"));
  const patchId = Number(c.req.param("patchId"));
  const [deleted] = await db
    .delete(patches)
    .where(eq(patches.id, patchId))
    .returning();
  if (!deleted || deleted.gameId !== gameId) {
    return c.json({ error: "Патч не знайдено" }, 404);
  }

  const cache = patchedCachePath(gameId, patchId, ".bin");
  if (fileExists(cache)) unlinkSync(cache);

  return c.json({ ok: true });
});

gameRoutes.post("/:id/scrape", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);
  if (!game.romFile) {
    return c.json({ error: "Завантажте ROM для пошуку в ScreenScraper" }, 400);
  }

  try {
    const result = await lookupByHash(
      game.romFile.crc32,
      game.romFile.md5,
      game.romFile.sha1,
      game.platform?.shortName ?? "",
    );

    if (!result) {
      return c.json({ error: "Гру не знайдено в ScreenScraper" }, 404);
    }

    const existing = game.scrapedMetadata;
    const values = {
      source: "screenscraper",
      externalId: result.externalId,
      title: result.title,
      description: result.description,
      coverUrl: result.coverUrl,
      rawPayload: result.rawPayload,
      syncedAt: new Date().toISOString(),
    };

    if (existing) {
      await db
        .update(scrapedMetadata)
        .set(values)
        .where(eq(scrapedMetadata.gameId, id));
    } else {
      await db.insert(scrapedMetadata).values({ gameId: id, ...values });
    }

    const updated = await getGameOr404(id);
    return c.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Помилка ScreenScraper";
    return c.json({ error: message }, 502);
  }
});
