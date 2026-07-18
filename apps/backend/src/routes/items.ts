import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { eq, and, inArray } from "drizzle-orm";
import { Hono } from "hono";
import {
  createItemSchema,
  updateItemSchema,
  kindHasFeature,
  normalizeTagNames,
  priceForCondition,
  type GameCondition,
  type KindFeatures,
  type MediaType,
  type Region,
  PATCH_FORMATS,
} from "@shellf/shared";
import { db } from "../db";
import {
  groups,
  itemTags,
  items,
  kinds,
  mediaAssets,
  patches,
  romFiles,
  saves,
  scrapedMetadata,
  tags,
} from "../db/schema";
import { computeRomHashes } from "../lib/hashes";
import { applyPatch, detectPatchFormat, PatchError } from "../lib/patcher";
import { createZip, type ZipEntry } from "../lib/zip";
import { lookupByHash } from "../lib/screenscraper";
import {
  consoleNameForGroupSlug,
  lookupProduct,
  PriceChartingError,
} from "../lib/pricecharting";
import {
  attachTagNames,
  resolveTagIds,
  shapeItemWithTags,
  syncItemTags,
} from "../lib/tags";
import {
  ensureParentDir,
  fileExists,
  deleteItemFiles,
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

const itemInclude = {
  kind: true as const,
  group: true as const,
  romFile: true as const,
  mediaAssets: true as const,
  patches: true as const,
  saves: true as const,
  scrapedMetadata: true as const,
  itemTags: {
    with: {
      tag: true as const,
    },
  },
};

async function getItemOr404(id: number) {
  const item = await db.query.items.findFirst({
    where: eq(items.id, id),
    with: itemInclude,
  });
  return item ? shapeItemWithTags(item) : undefined;
}

function itemHasFeature(
  item: { kind?: { features?: KindFeatures | null } | null },
  feature: keyof KindFeatures,
) {
  return kindHasFeature(item.kind?.features, feature);
}

export const itemRoutes = new Hono();

itemRoutes.get("/", async (c) => {
  const groupId = c.req.query("groupId") ?? c.req.query("platformId");
  const search = c.req.query("search");
  const tagSlug = c.req.query("tag");
  const tagIdParam = c.req.query("tagId");

  let tagItemIds: number[] | null = null;
  if (tagIdParam || tagSlug) {
    const tagRow = tagIdParam
      ? await db.query.tags.findFirst({ where: eq(tags.id, Number(tagIdParam)) })
      : await db.query.tags.findFirst({ where: eq(tags.slug, tagSlug!) });
    if (!tagRow) return c.json([]);
    const links = await db
      .select({ itemId: itemTags.itemId })
      .from(itemTags)
      .where(eq(itemTags.tagId, tagRow.id));
    tagItemIds = links.map((l) => l.itemId);
    if (!tagItemIds.length) return c.json([]);
  }

  const allItems = await db.query.items.findMany({
    where: (fields, { eq: eqFn, and: andFn, inArray: inArr }) => {
      const parts = [];
      if (groupId) parts.push(eqFn(fields.groupId, Number(groupId)));
      if (tagItemIds) parts.push(inArr(fields.id, tagItemIds));
      if (!parts.length) return undefined;
      return parts.length === 1 ? parts[0]! : andFn(...parts);
    },
    with: {
      kind: true,
      group: true,
      romFile: true,
      mediaAssets: true,
      scrapedMetadata: true,
      itemTags: { with: { tag: true } },
    },
    orderBy: (g, { desc }) => [desc(g.updatedAt)],
  });

  const filtered = search
    ? allItems.filter((g) =>
        g.title.toLowerCase().includes(search.toLowerCase()),
      )
    : allItems;

  return c.json(filtered.map(shapeItemWithTags));
});

itemRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);
  return c.json(item);
});

itemRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const groupId = parsed.data.groupId ?? parsed.data.platformId!;
  const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
  if (!group) return c.json({ error: "Групу не знайдено" }, 404);

  let kindId = parsed.data.kindId ?? group.kindId ?? null;
  if (!kindId) {
    const [gameKind] = await db
      .select()
      .from(kinds)
      .where(eq(kinds.slug, "game"));
    kindId = gameKind?.id ?? null;
  }
  if (!kindId) return c.json({ error: "Kind не знайдено" }, 404);

  const [kind] = await db.select().from(kinds).where(eq(kinds.id, kindId));
  if (!kind) return c.json({ error: "Kind не знайдено" }, 404);

  const {
    platformId: _platformId,
    groupId: _groupId,
    kindId: _kindId,
    tagIds,
    tags: tagNames,
    genres,
    ...rest
  } = parsed.data;

  const [created] = await db
    .insert(items)
    .values({
      ...rest,
      groupId,
      kindId,
      isPirate: parsed.data.isPirate ?? false,
      updatedAt: new Date().toISOString(),
    })
    .returning();

  const resolvedTagIds = await resolveTagIds({
    tagIds,
    tagNames: [...(tagNames ?? []), ...(genres ?? [])],
  });
  await syncItemTags(created!.id, resolvedTagIds);

  const item = await getItemOr404(created!.id);
  return c.json(item, 201);
});

itemRoutes.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const {
    marketPrice,
    description,
    coverUrl,
    platformId: _platformId,
    tagIds,
    tags: tagNames,
    genres,
    ...itemData
  } = parsed.data;

  const patchValues: Partial<typeof items.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (itemData.title !== undefined) patchValues.title = itemData.title;
  if (itemData.region !== undefined) patchValues.region = itemData.region;
  if (itemData.purchasePrice !== undefined) {
    patchValues.purchasePrice = itemData.purchasePrice;
  }
  if (itemData.currency !== undefined) patchValues.currency = itemData.currency;
  if (itemData.condition !== undefined) patchValues.condition = itemData.condition;
  if (itemData.isPirate !== undefined) {
    patchValues.isPirate = itemData.isPirate ?? false;
  }
  if (itemData.notes !== undefined) patchValues.notes = itemData.notes;
  if (itemData.coverRotation !== undefined) {
    patchValues.coverRotation = itemData.coverRotation;
  }
  if (itemData.customMeta !== undefined) {
    patchValues.customMeta = itemData.customMeta;
  }
  const nextGroupId = itemData.groupId ?? _platformId;
  if (nextGroupId !== undefined) patchValues.groupId = nextGroupId;

  const [updated] = await db
    .update(items)
    .set(patchValues)
    .where(eq(items.id, id))
    .returning();

  if (!updated) return c.json({ error: "Айтем не знайдено" }, 404);

  if (tagIds !== undefined || tagNames !== undefined || genres !== undefined) {
    const resolvedTagIds = await resolveTagIds({
      tagIds: tagIds ?? undefined,
      tagNames: normalizeTagNames([...(tagNames ?? []), ...(genres ?? [])]),
    });
    // If only tagIds provided (possibly empty), replace; if only names, replace with resolved
    await syncItemTags(id, resolvedTagIds);
  }

  if (marketPrice !== undefined || description !== undefined || coverUrl !== undefined) {
    const existing = await db.query.scrapedMetadata.findFirst({
      where: eq(scrapedMetadata.itemId, id),
    });
    const scrapedPatch: Partial<typeof scrapedMetadata.$inferInsert> = {};
    if (marketPrice !== undefined) {
      scrapedPatch.marketPrice = marketPrice;
      scrapedPatch.marketPriceSyncedAt = new Date().toISOString();
    }
    if (description !== undefined) scrapedPatch.description = description;
    if (coverUrl !== undefined) scrapedPatch.coverUrl = coverUrl;

    if (existing) {
      await db
        .update(scrapedMetadata)
        .set(scrapedPatch)
        .where(eq(scrapedMetadata.itemId, id));
    } else {
      await db.insert(scrapedMetadata).values({
        itemId: id,
        ...scrapedPatch,
      });
    }
  }

  const item = await getItemOr404(id);
  return c.json(item);
});

itemRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);

  deleteItemFiles(item);

  const [deleted] = await db.delete(items).where(eq(items.id, id)).returning();
  if (!deleted) return c.json({ error: "Айтем не знайдено" }, 404);
  return c.json({ ok: true });
});

/** Remove display cover: all box media + scraped ScreenScraper coverUrl. */
itemRoutes.delete("/:id/cover", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);

  const boxAssets = (item.mediaAssets ?? []).filter((m) => m.type === "box");
  for (const asset of boxAssets) {
    deleteStoredFile(asset.storagePath);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  }

  const existing = await db.query.scrapedMetadata.findFirst({
    where: eq(scrapedMetadata.itemId, id),
  });
  if (existing) {
    await db
      .update(scrapedMetadata)
      .set({ coverUrl: null })
      .where(eq(scrapedMetadata.itemId, id));
  }

  await db
    .update(items)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(items.id, id));

  const updated = await getItemOr404(id);
  return c.json(updated);
});

itemRoutes.post("/:id/rom", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);
  if (!itemHasFeature(item, "rom")) {
    return c.json({ error: "ROM не підтримується для цього kind" }, 400);
  }

  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "Файл ROM обов'язковий" }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hashes = computeRomHashes(buffer);
  const filename = file.name || "rom.bin";
  const dest = romPath(item.groupId, id, filename);
  ensureParentDir(dest);
  writeFileSync(dest, buffer);

  const relative = relativeToData(dest);
  const existing = item.romFile;
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
      .where(eq(romFiles.itemId, id));
  } else {
    await db.insert(romFiles).values({
      itemId: id,
      storagePath: relative,
      originalFilename: filename,
      ...hashes,
    });
  }

  await db
    .update(items)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(items.id, id));

  const updated = await getItemOr404(id);
  return c.json(updated);
});

itemRoutes.delete("/:id/rom", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item?.romFile) {
    return c.json({ error: "ROM не завантажено" }, 404);
  }

  deleteStoredFile(item.romFile.storagePath);
  clearPatchedCache(id);
  await db.delete(romFiles).where(eq(romFiles.itemId, id));
  await db
    .update(items)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(items.id, id));

  return c.json({ ok: true });
});

itemRoutes.post("/:id/media", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);

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
      .where(and(eq(mediaAssets.itemId, id), eq(mediaAssets.type, type)));
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
      itemId: id,
      type,
      storagePath: relativeToData(dest),
      mimeType: file.type || "application/octet-stream",
      originalFilename: filename,
    })
    .returning();

  await db
    .update(items)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(items.id, id));

  return c.json(asset, 201);
});

itemRoutes.delete("/:id/media/:assetId", async (c) => {
  const itemId = Number(c.req.param("id"));
  const assetId = Number(c.req.param("assetId"));
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId));

  if (!asset || asset.itemId !== itemId) {
    return c.json({ error: "Медіа не знайдено" }, 404);
  }

  deleteStoredFile(asset.storagePath);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
  await db
    .update(items)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(items.id, itemId));

  return c.json({ ok: true });
});

itemRoutes.get("/:id/media/:assetId", async (c) => {
  const itemId = Number(c.req.param("id"));
  const assetId = Number(c.req.param("assetId"));
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId));

  if (!asset || asset.itemId !== itemId) {
    return c.json({ error: "Медіа не знайдено" }, 404);
  }

  const fullPath = resolveFromData(asset.storagePath);
  if (!fileExists(fullPath)) {
    return c.json({ error: "Файл не знайдено на диску" }, 404);
  }

  const data = readFileSync(fullPath);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(asset.originalFilename, "inline"),
    },
  });
});

async function getRomBuffer(
  itemId: number,
  patchId?: number,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const item = await getItemOr404(itemId);
  if (!item?.romFile) {
    throw new Error("ROM_NOT_FOUND");
  }

  const romFullPath = resolveFromData(item.romFile.storagePath);
  const romBuffer = readFileSync(romFullPath);
  const ext = extname(item.romFile.originalFilename) || ".bin";

  if (!patchId) {
    return {
      buffer: romBuffer,
      filename: item.romFile.originalFilename,
      mimeType: "application/octet-stream",
    };
  }

  const [patch] = await db
    .select()
    .from(patches)
    .where(eq(patches.id, patchId));
  if (!patch || patch.itemId !== itemId) {
    throw new Error("PATCH_NOT_FOUND");
  }

  const patchedFilename = patchedRomFilename(item.romFile.originalFilename, patch.name);

  const cachePath = patchedCachePath(itemId, patchId, ext);
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

itemRoutes.get("/:id/rom", async (c) => {
  const id = Number(c.req.param("id"));
  const patchId = c.req.query("patchId")
    ? Number(c.req.query("patchId"))
    : undefined;
  const inline = c.req.query("inline") === "1";

  try {
    const { buffer, filename, mimeType } = await getRomBuffer(id, patchId);
    return new Response(new Uint8Array(buffer), {
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

itemRoutes.get("/:id/pack", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);

  const hasAssets =
    !!item.romFile ||
    (item.mediaAssets?.length ?? 0) > 0 ||
    (item.patches?.length ?? 0) > 0 ||
    (item.saves?.length ?? 0) > 0;

  if (!hasAssets) {
    return c.json({ error: "Немає файлів для пакування" }, 404);
  }

  const root = sanitizeFilenamePart(item.title) || `game-${id}`;
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
    if (item.romFile) {
      const rom = await getRomBuffer(id);
      add(`rom/${rom.filename}`, rom.buffer);
    }

    for (const patch of item.patches ?? []) {
      const patchFile = resolveFromData(patch.storagePath);
      if (!fileExists(patchFile)) continue;
      add(
        `patches/${patch.originalFilename || `${patch.name}.${patch.format}`}`,
        readFileSync(patchFile),
      );

      if (item.romFile) {
        try {
          const patched = await getRomBuffer(id, patch.id);
          add(`patched/${patched.filename}`, patched.buffer);
        } catch {
          // skip failed patch apply
        }
      }
    }

    for (const save of item.saves ?? []) {
      const saveFile = resolveFromData(save.storagePath);
      if (!fileExists(saveFile)) continue;
      add(
        `saves/${save.originalFilename || `${save.name}.srm`}`,
        readFileSync(saveFile),
      );
    }

    for (const asset of item.mediaAssets ?? []) {
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

    return new Response(new Uint8Array(zip), {
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

itemRoutes.get("/:id/play", async (c) => {
  const id = Number(c.req.param("id"));
  const patchId = c.req.query("patchId");
  const saveId = c.req.query("saveId");
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);
  if (!itemHasFeature(item, "emulator")) {
    return c.json({ error: "Емулятор не підтримується для цього kind" }, 400);
  }
  if (!item.group?.emulatorCore) {
    return c.json({ error: "Емулятор для цієї групи недоступний" }, 400);
  }

  const romQs = new URLSearchParams();
  if (patchId) romQs.set("patchId", patchId);
  const qs = romQs.toString();

  return c.json({
    romUrl: `/api/items/${id}/rom${qs ? `?${qs}` : ""}`,
    saveUrl: saveId ? `/api/items/${id}/saves/${saveId}` : null,
    core: item.group.emulatorCore,
    title: item.title,
  });
});

itemRoutes.get("/:id/patches", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select().from(patches).where(eq(patches.itemId, id));
  return c.json(list);
});

itemRoutes.post("/:id/patches", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);
  if (!itemHasFeature(item, "patches")) {
    return c.json({ error: "Патчі не підтримуються для цього kind" }, 400);
  }

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
      itemId: id,
      name: name || basename(filename, extname(filename)),
      format,
      storagePath: relativeToData(dest),
      originalFilename: filename,
    })
    .returning();

  return c.json(created, 201);
});

itemRoutes.delete("/:id/patches/:patchId", async (c) => {
  const itemId = Number(c.req.param("id"));
  const patchId = Number(c.req.param("patchId"));
  const [deleted] = await db
    .delete(patches)
    .where(eq(patches.id, patchId))
    .returning();
  if (!deleted || deleted.itemId !== itemId) {
    return c.json({ error: "Патч не знайдено" }, 404);
  }

  deleteStoredFile(deleted.storagePath);
  deletePatchCache(itemId, patchId);

  return c.json({ ok: true });
});

itemRoutes.get("/:id/saves", async (c) => {
  const id = Number(c.req.param("id"));
  const list = await db.select().from(saves).where(eq(saves.itemId, id));
  return c.json(list);
});

itemRoutes.post("/:id/saves", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);
  if (!itemHasFeature(item, "saves")) {
    return c.json({ error: "Збереження не підтримуються для цього kind" }, 400);
  }

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
      itemId: id,
      name: name || basename(originalFilename, extname(originalFilename)),
      format,
      storagePath: relativeToData(dest),
      originalFilename,
      size: buffer.byteLength,
    })
    .returning();

  return c.json(created, 201);
});

itemRoutes.get("/:id/saves/:saveId", async (c) => {
  const itemId = Number(c.req.param("id"));
  const saveId = Number(c.req.param("saveId"));
  const [save] = await db.select().from(saves).where(eq(saves.id, saveId));

  if (!save || save.itemId !== itemId) {
    return c.json({ error: "Сейв не знайдено" }, 404);
  }

  const fullPath = resolveFromData(save.storagePath);
  if (!fileExists(fullPath)) {
    return c.json({ error: "Файл не знайдено на диску" }, 404);
  }

  const data = readFileSync(fullPath);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": contentDisposition(save.originalFilename, "attachment"),
    },
  });
});

itemRoutes.delete("/:id/saves/:saveId", async (c) => {
  const itemId = Number(c.req.param("id"));
  const saveId = Number(c.req.param("saveId"));
  const [deleted] = await db
    .delete(saves)
    .where(eq(saves.id, saveId))
    .returning();
  if (!deleted || deleted.itemId !== itemId) {
    return c.json({ error: "Сейв не знайдено" }, 404);
  }

  deleteStoredFile(deleted.storagePath);
  return c.json({ ok: true });
});

itemRoutes.post("/:id/prices/sync", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);

  const region = (item.region as Region | null) ?? null;
  const consoleName =
    consoleNameForGroupSlug(item.group?.slug, region) ?? item.group?.name ?? null;

  try {
    const pc = await lookupProduct({
      title: item.title,
      groupSlug: item.group?.slug,
      region,
      consoleName,
    });

    const marketPrice =
      priceForCondition(pc, item.condition as GameCondition | null) ??
      pc.cib ??
      pc.loose ??
      pc.newPrice ??
      null;
    const marketPriceSyncedAt = pc.syncedAt;
    const existing = item.scrapedMetadata;

    if (existing) {
      await db
        .update(scrapedMetadata)
        .set({
          pricecharting: pc,
          marketPrice,
          marketPriceSyncedAt,
        })
        .where(eq(scrapedMetadata.itemId, id));
    } else {
      await db.insert(scrapedMetadata).values({
        itemId: id,
        source: "pricecharting",
        pricecharting: pc,
        marketPrice,
        marketPriceSyncedAt,
      });
    }

    const updated = await getItemOr404(id);
    return c.json(updated);
  } catch (err) {
    if (err instanceof PriceChartingError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }
});

itemRoutes.post("/:id/scrape", async (c) => {
  const id = Number(c.req.param("id"));
  const item = await getItemOr404(id);
  if (!item) return c.json({ error: "Айтем не знайдено" }, 404);
  if (!itemHasFeature(item, "scrape")) {
    return c.json({ error: "Scrape не підтримується для цього kind" }, 400);
  }
  if (!item.romFile) {
    return c.json({ error: "Завантажте ROM для пошуку в ScreenScraper" }, 400);
  }

  try {
    const result = await lookupByHash({
      crc: item.romFile.crc32,
      md5: item.romFile.md5,
      sha1: item.romFile.sha1,
      systemShortName: item.group?.slug ?? "",
      romFilename: item.romFile.originalFilename,
      romSize: item.romFile.size,
      region: item.region,
      condition: item.condition,
    });

    if (!result) {
      return c.json({ error: "Айтем не знайдено в ScreenScraper" }, 404);
    }

    const existing = item.scrapedMetadata;
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
        .where(eq(scrapedMetadata.itemId, id));
    } else {
      await db.insert(scrapedMetadata).values({ itemId: id, ...values });
    }

    if (result.genres.length > 0) {
      await attachTagNames(id, result.genres);
    }

    const updated = await getItemOr404(id);
    return c.json(updated);
  } catch (err) {
    console.error("[scrape]", err);
    const message = err instanceof Error ? err.message : "Помилка ScreenScraper";
    return c.json({ error: message }, 502);
  }
});
