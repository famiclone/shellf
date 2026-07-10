import { join, dirname } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { DATA_DIR } from "../lib/config";

const DATA_DIR_ENV = process.env.DATA_DIR ?? DATA_DIR;

export const paths = {
  root: DATA_DIR_ENV,
  roms: join(DATA_DIR_ENV, "roms"),
  media: join(DATA_DIR_ENV, "media"),
  patches: join(DATA_DIR_ENV, "patches"),
  cache: join(DATA_DIR_ENV, "cache", "patched"),
  scrapedCovers: join(DATA_DIR_ENV, "cache", "covers"),
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
