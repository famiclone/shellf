import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { eq, and } from "drizzle-orm";
import { Hono } from "hono";
import {
  createGameSchema,
  updateGameSchema,
  normalizeGenres,
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
  saves,
  scrapedMetadata,
} from "../db/schema";
import { computeRomHashes } from "../lib/hashes";
import { applyPatch, detectPatchFormat, PatchError } from "../lib/patcher";
import { createZip, type ZipEntry } from "../lib/zip";
import { lookupByHash } from "../lib/screenscraper";
import {
  ensureParentDir,
  fileExists,
  deleteGameFiles,
  deletePatchCache,
  deleteStoredFile,
  clearPatchedCache,
  mediaPath,
  patchPath,
  patchedCachePath,
  relativeToData,
  resolveFromData,
  romPath,
  savePath,
} from "../lib/storage";

function sanitizeFilenamePart(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim();
}

/** ASCII-safe Content-Disposition; keeps original name via filename*=UTF-8''. */
function contentDisposition(
  filename: string,
  type: "inline" | "attachment" = "inline",
): string {
  const ascii =
    filename
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/["\\]/g, "_")
      .trim() || "file";
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function patchedRomFilename(originalFilename: string, patchName: string): string {
  const ext = extname(originalFilename) || ".bin";
  const base = basename(originalFilename, ext);
  const safeBase = sanitizeFilenamePart(base) || "ROM";
  const safePatch = sanitizeFilenamePart(patchName) || "patch";
  return `${safeBase}_(${safePatch})${ext}`;
}

function detectSaveFormat(filename: string): "sram" | null {
  const ext = extname(filename).toLowerCase();
  if (ext === ".srm" || ext === ".sav") return "sram";
  return null;
}

function safeStorageFilename(filename: string, fallbackExt: string): string {
  const ext = extname(filename) || fallbackExt;
  const base = basename(filename, extname(filename));
  const safeBase =
    sanitizeFilenamePart(base)
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "_")
      .trim() || "file";
  return `${safeBase}${ext.toLowerCase()}`;
}

const gameInclude = {
  platform: true as const,
  romFile: true as const,
  mediaAssets: true as const,
  patches: true as const,
  saves: true as const,
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
      genres: normalizeGenres(parsed.data.genres ?? []),
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
  if (gameData.genres !== undefined) {
    gameData.genres = normalizeGenres(gameData.genres ?? []);
  }

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
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);

  deleteGameFiles(game);

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
  if (existing?.storagePath && existing.storagePath !== relative) {
    deleteStoredFile(existing.storagePath);
  }
  clearPatchedCache(id);
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

gameRoutes.delete("/:id/rom", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game?.romFile) {
    return c.json({ error: "ROM не завантажено" }, 404);
  }

  deleteStoredFile(game.romFile.storagePath);
  clearPatchedCache(id);
  await db.delete(romFiles).where(eq(romFiles.gameId, id));
  await db
    .update(games)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(games.id, id));

  return c.json({ ok: true });
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

  if (c.req.query("replace") === "true") {
    const existingAssets = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.gameId, id), eq(mediaAssets.type, type)));
    for (const asset of existingAssets) {
      deleteStoredFile(asset.storagePath);
      await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
    }
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

gameRoutes.delete("/:id/media/:assetId", async (c) => {
  const gameId = Number(c.req.param("id"));
  const assetId = Number(c.req.param("assetId"));
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId));

  if (!asset || asset.gameId !== gameId) {
    return c.json({ error: "Медіа не знайдено" }, 404);
  }

  deleteStoredFile(asset.storagePath);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
  await db
    .update(games)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(games.id, gameId));

  return c.json({ ok: true });
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
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(asset.originalFilename, "inline"),
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
    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": contentDisposition(
          filename,
          inline ? "inline" : "attachment",
        ),
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

gameRoutes.get("/:id/pack", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);

  const hasAssets =
    !!game.romFile ||
    (game.mediaAssets?.length ?? 0) > 0 ||
    (game.patches?.length ?? 0) > 0 ||
    (game.saves?.length ?? 0) > 0;

  if (!hasAssets) {
    return c.json({ error: "Немає файлів для пакування" }, 404);
  }

  const root = sanitizeFilenamePart(game.title) || `game-${id}`;
  const packEntries: ZipEntry[] = [];
  const usedNames = new Set<string>();

  const add = (relPath: string, data: Buffer) => {
    let name = relPath.replace(/\\/g, "/");
    const safeParts = name.split("/").map((part) => sanitizeFilenamePart(part) || "file");
    name = safeParts.join("/");
    if (usedNames.has(name)) {
      const dir = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "";
      const file = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
      const ext = extname(file);
      const base = basename(file, ext);
      let i = 2;
      do {
        name = dir ? `${dir}/${base}_${i}${ext}` : `${base}_${i}${ext}`;
        i++;
      } while (usedNames.has(name));
    }
    usedNames.add(name);
    packEntries.push({ name: `${root}/${name}`, data });
  };

  try {
    if (game.romFile) {
      const rom = await getRomBuffer(id);
      add(`rom/${rom.filename}`, rom.buffer);
    }

    for (const patch of game.patches ?? []) {
      const patchFile = resolveFromData(patch.storagePath);
      if (!fileExists(patchFile)) continue;
      add(
        `patches/${patch.originalFilename || `${patch.name}.${patch.format}`}`,
        readFileSync(patchFile),
      );

      if (game.romFile) {
        try {
          const patched = await getRomBuffer(id, patch.id);
          add(`patched/${patched.filename}`, patched.buffer);
        } catch {
          // skip failed patch apply
        }
      }
    }

    for (const save of game.saves ?? []) {
      const saveFile = resolveFromData(save.storagePath);
      if (!fileExists(saveFile)) continue;
      add(
        `saves/${save.originalFilename || `${save.name}.srm`}`,
        readFileSync(saveFile),
      );
    }

    for (const asset of game.mediaAssets ?? []) {
      const mediaFile = resolveFromData(asset.storagePath);
      if (!fileExists(mediaFile)) continue;
      const folder =
        asset.type === "manual"
          ? "manuals"
          : asset.type === "box" || asset.type === "photo"
            ? "art"
            : "media";
      const prefix = folder === "art" ? `${asset.type}_` : "";
      add(
        `${folder}/${prefix}${asset.originalFilename}`,
        readFileSync(mediaFile),
      );
    }

    if (packEntries.length === 0) {
      return c.json({ error: "Немає файлів для пакування" }, 404);
    }

    const zip = createZip(packEntries);
    const zipName = `${root}.zip`;

    return new Response(zip, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(zip.length),
        "Content-Disposition": contentDisposition(zipName, "attachment"),
      },
    });
  } catch (err) {
    if (err instanceof PatchError) {
      return c.json({ error: err.message }, 422);
    }
    throw err;
  }
});

gameRoutes.get("/:id/play", async (c) => {
  const id = Number(c.req.param("id"));
  const patchId = c.req.query("patchId");
  const saveId = c.req.query("saveId");
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);
  if (!game.platform?.emulatorCore) {
    return c.json({ error: "Емулятор для цієї платформи недоступний" }, 400);
  }

  const romQs = new URLSearchParams();
  if (patchId) romQs.set("patchId", patchId);
  const qs = romQs.toString();

  return c.json({
    romUrl: `/api/games/${id}/rom${qs ? `?${qs}` : ""}`,
    saveUrl: saveId ? `/api/games/${id}/saves/${saveId}` : null,
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

  deleteStoredFile(deleted.storagePath);
  deletePatchCache(gameId, patchId);

  return c.json({ ok: true });
});

gameRoutes.get("/:id/saves", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select().from(saves).where(eq(saves.gameId, id));
  return c.json(list);
});

gameRoutes.post("/:id/saves", async (c) => {
  const id = Number(c.req.param("id"));
  const game = await getGameOr404(id);
  if (!game) return c.json({ error: "Гру не знайдено" }, 404);

  const formData = await c.req.formData();
  const file = formData.get("file");
  const name = (formData.get("name") as string) || undefined;
  if (!(file instanceof File)) {
    return c.json({ error: "Файл сейву обов'язковий" }, 400);
  }

  const format = detectSaveFormat(file.name);
  if (!format) {
    return c.json({ error: "Підтримуються лише SRAM сейви (.srm, .sav)" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.byteLength) {
    return c.json({ error: "Файл сейву порожній" }, 400);
  }

  const originalFilename = file.name;
  const storageFilename = safeStorageFilename(originalFilename, ".srm");
  const dest = savePath(id, storageFilename);
  ensureParentDir(dest);
  writeFileSync(dest, buffer);

  const [created] = await db
    .insert(saves)
    .values({
      gameId: id,
      name: name || basename(originalFilename, extname(originalFilename)),
      format,
      storagePath: relativeToData(dest),
      originalFilename,
      size: buffer.byteLength,
    })
    .returning();

  return c.json(created, 201);
});

gameRoutes.get("/:id/saves/:saveId", async (c) => {
  const gameId = Number(c.req.param("id"));
  const saveId = Number(c.req.param("saveId"));
  const [save] = await db.select().from(saves).where(eq(saves.id, saveId));

  if (!save || save.gameId !== gameId) {
    return c.json({ error: "Сейв не знайдено" }, 404);
  }

  const fullPath = resolveFromData(save.storagePath);
  if (!fileExists(fullPath)) {
    return c.json({ error: "Файл не знайдено на диску" }, 404);
  }

  const data = readFileSync(fullPath);
  return new Response(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(save.originalFilename, "attachment"),
    },
  });
});

gameRoutes.delete("/:id/saves/:saveId", async (c) => {
  const gameId = Number(c.req.param("id"));
  const saveId = Number(c.req.param("saveId"));
  const [deleted] = await db
    .delete(saves)
    .where(eq(saves.id, saveId))
    .returning();
  if (!deleted || deleted.gameId !== gameId) {
    return c.json({ error: "Сейв не знайдено" }, 404);
  }

  deleteStoredFile(deleted.storagePath);
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

    if (result.genres.length > 0) {
      const merged = normalizeGenres([...(game.genres ?? []), ...result.genres]);
      await db
        .update(games)
        .set({ genres: merged, updatedAt: new Date().toISOString() })
        .where(eq(games.id, id));
    }

    const updated = await getGameOr404(id);
    return c.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Помилка ScreenScraper";
    return c.json({ error: message }, 502);
  }
});
