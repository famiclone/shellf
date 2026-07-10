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

export function romPath(platformId: number, gameId: number, filename: string) {
  return join(paths.roms, String(platformId), String(gameId), filename);
}

export function mediaPath(gameId: number, filename: string) {
  return join(paths.media, String(gameId), filename);
}

export function patchPath(gameId: number, filename: string) {
  return join(paths.patches, String(gameId), filename);
}

export function savePath(gameId: number, filename: string) {
  return join(paths.saves, String(gameId), filename);
}

export function patchedCachePath(gameId: number, patchId: number, ext: string) {
  return join(paths.cache, String(gameId), `${patchId}${ext}`);
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

export function clearPatchedCache(gameId: number) {
  safeRmDir(join(paths.cache, String(gameId)));
}

export function deletePatchCache(gameId: number, patchId: number) {
  const dir = join(paths.cache, String(gameId));
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(String(patchId))) {
      safeUnlink(join(dir, name));
    }
  }
}

export function deleteGameFiles(game: {
  id: number;
  platformId: number;
  romFile?: { storagePath: string } | null;
  mediaAssets?: { storagePath: string }[];
  patches?: { storagePath: string }[];
  saves?: { storagePath: string }[];
}) {
  if (game.romFile) {
    safeUnlink(resolveFromData(game.romFile.storagePath));
  }

  for (const asset of game.mediaAssets ?? []) {
    safeUnlink(resolveFromData(asset.storagePath));
  }

  for (const patch of game.patches ?? []) {
    safeUnlink(resolveFromData(patch.storagePath));
  }

  for (const save of game.saves ?? []) {
    safeUnlink(resolveFromData(save.storagePath));
  }

  safeRmDir(join(paths.media, String(game.id)));
  safeRmDir(join(paths.patches, String(game.id)));
  safeRmDir(join(paths.cache, String(game.id)));
  safeRmDir(join(paths.saves, String(game.id)));
  safeRmDir(join(paths.roms, String(game.platformId), String(game.id)));
}
