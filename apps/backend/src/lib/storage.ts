import { join, dirname } from "node:path";
import { mkdirSync, existsSync, rmSync, unlinkSync, readdirSync } from "node:fs";
import { DATA_DIR } from "../lib/config";

const DATA_DIR_ENV = process.env.DATA_DIR ?? DATA_DIR;

export const paths = {
  root: DATA_DIR_ENV,
  roms: join(DATA_DIR_ENV, "roms"),
  media: join(DATA_DIR_ENV, "media"),
  patches: join(DATA_DIR_ENV, "patches"),
  cache: join(DATA_DIR_ENV, "cache", "patched"),
  scrapedCovers: join(DATA_DIR_ENV, "cache", "covers"),
  saves: join(DATA_DIR_ENV, "saves"),
};

export function ensureDataDirs() {
  for (const dir of Object.values(paths)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function romPath(groupId: number, itemId: number, filename: string) {
  return join(paths.roms, String(groupId), String(itemId), filename);
}

export function mediaPath(itemId: number, filename: string) {
  return join(paths.media, String(itemId), filename);
}

export function patchPath(itemId: number, filename: string) {
  return join(paths.patches, String(itemId), filename);
}

export function savePath(itemId: number, filename: string) {
  return join(paths.saves, String(itemId), filename);
}

export function patchedCachePath(itemId: number, patchId: number, ext: string) {
  return join(paths.cache, String(itemId), `${patchId}${ext}`);
}

export function ensureParentDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function relativeToData(absolutePath: string) {
  if (absolutePath.startsWith(DATA_DIR_ENV)) {
    return absolutePath.slice(DATA_DIR_ENV.length + 1);
  }
  return absolutePath;
}

export function resolveFromData(relativePath: string) {
  return join(DATA_DIR_ENV, relativePath);
}

export function fileExists(path: string) {
  return existsSync(path);
}

function safeUnlink(path: string) {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // ignore missing or locked files
  }
}

function safeRmDir(path: string) {
  try {
    if (existsSync(path)) rmSync(path, { recursive: true, force: true });
  } catch {
    // ignore missing or locked directories
  }
}

export function deleteStoredFile(relativePath: string) {
  safeUnlink(resolveFromData(relativePath));
}

export function clearPatchedCache(itemId: number) {
  safeRmDir(join(paths.cache, String(itemId)));
}

export function deletePatchCache(itemId: number, patchId: number) {
  const dir = join(paths.cache, String(itemId));
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(String(patchId))) {
      safeUnlink(join(dir, name));
    }
  }
}

export function deleteItemFiles(item: {
  id: number;
  groupId: number;
  romFile?: { storagePath: string } | null;
  mediaAssets?: { storagePath: string }[];
  patches?: { storagePath: string }[];
  saves?: { storagePath: string }[];
}) {
  if (item.romFile) {
    safeUnlink(resolveFromData(item.romFile.storagePath));
  }

  for (const asset of item.mediaAssets ?? []) {
    safeUnlink(resolveFromData(asset.storagePath));
  }

  for (const patch of item.patches ?? []) {
    safeUnlink(resolveFromData(patch.storagePath));
  }

  for (const save of item.saves ?? []) {
    safeUnlink(resolveFromData(save.storagePath));
  }

  safeRmDir(join(paths.media, String(item.id)));
  safeRmDir(join(paths.patches, String(item.id)));
  safeRmDir(join(paths.cache, String(item.id)));
  safeRmDir(join(paths.saves, String(item.id)));
  safeRmDir(join(paths.roms, String(item.groupId), String(item.id)));
}

/** @deprecated Use deleteItemFiles */
export const deleteGameFiles = deleteItemFiles;
