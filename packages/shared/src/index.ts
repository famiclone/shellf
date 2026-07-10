import { z } from "zod";

export const GAME_CONDITIONS = [
  "sealed",
  "cib",
  "loose",
  "cart_only",
  "manual_only",
] as const;

export type GameCondition = (typeof GAME_CONDITIONS)[number];

export const GAME_CONDITION_LABELS: Record<GameCondition, string> = {
  sealed: "Запечатана",
  cib: "Повний комплект (CIB)",
  loose: "Без коробки",
  cart_only: "Тільки картридж",
  manual_only: "Тільки мануал",
};

export const MEDIA_TYPES = ["box", "manual", "photo"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  box: "Обкладинка",
  manual: "Мануал",
  photo: "Фото",
};

export const PATCH_FORMATS = ["ips", "bps"] as const;
export type PatchFormat = (typeof PATCH_FORMATS)[number];

export const SAVE_FORMATS = ["sram"] as const;
export type SaveFormat = (typeof SAVE_FORMATS)[number];

export const REGIONS = ["JP", "US", "EU", "AU", "KR", "CN", "OTHER"] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  JP: "Японія",
  US: "США",
  EU: "Європа",
  AU: "Австралія",
  KR: "Корея",
  CN: "Китай",
  OTHER: "Інше",
};

export const GENRE_PRESETS = [
  "Action",
  "Adventure",
  "Platformer",
  "RPG",
  "Shooter",
  "Puzzle",
  "Sports",
  "Racing",
  "Fighting",
  "Strategy",
  "Simulation",
  "Horror",
] as const;

export type GenrePreset = (typeof GENRE_PRESETS)[number];

/** Trim, drop empties, dedupe case-insensitively (keeps first casing). */
export function normalizeGenres(genres: string[] | null | undefined): string[] {
  if (!genres?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of genres) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}

export const DEFAULT_PLATFORMS = [
  { name: "Nintendo Entertainment System", shortName: "nes", emulatorCore: "nes" },
  { name: "Family Computer", shortName: "famicom", emulatorCore: "nes" },
  { name: "Super Nintendo", shortName: "snes", emulatorCore: "snes" },
  { name: "Game Boy", shortName: "gb", emulatorCore: "gb" },
  { name: "Game Boy Color", shortName: "gbc", emulatorCore: "gb" },
  { name: "Game Boy Advance", shortName: "gba", emulatorCore: "gba" },
  { name: "Sega Mega Drive", shortName: "megadrive", emulatorCore: "segaMD" },
  { name: "Nintendo 64", shortName: "n64", emulatorCore: "n64" },
] as const;

export const createPlatformSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1).max(32),
  emulatorCore: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const createGameSchema = z.object({
  title: z.string().min(1),
  platformId: z.number().int().positive(),
  region: z.enum(REGIONS).optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  condition: z.enum(GAME_CONDITIONS).optional().nullable(),
  notes: z.string().optional().nullable(),
  genres: z.array(z.string().min(1)).max(20).optional().nullable(),
  customMeta: z.record(z.unknown()).optional().nullable(),
});

export const updateGameSchema = createGameSchema
  .partial()
  .omit({ platformId: true })
  .extend({
    marketPrice: z.number().nonnegative().optional().nullable(),
  });

export type CreatePlatformInput = z.infer<typeof createPlatformSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;

export interface Platform {
  id: number;
  name: string;
  shortName: string;
  emulatorCore: string | null;
  description: string | null;
  gameCount?: number;
}

export interface RomFile {
  id: number;
  gameId: number;
  storagePath: string;
  originalFilename: string;
  crc32: string;
  md5: string;
  sha1: string;
  size: number;
}

export interface MediaAsset {
  id: number;
  gameId: number;
  type: MediaType;
  storagePath: string;
  mimeType: string;
  originalFilename: string;
}

export interface Patch {
  id: number;
  gameId: number;
  name: string;
  format: PatchFormat;
  storagePath: string;
  originalFilename: string;
}

export interface Save {
  id: number;
  gameId: number;
  name: string;
  format: SaveFormat;
  storagePath: string;
  originalFilename: string;
  size: number;
}

export interface ScrapedMetadata {
  id: number;
  gameId: number;
  source: string;
  externalId: string | null;
  title: string | null;
  description: string | null;
  coverUrl: string | null;
  marketPrice: number | null;
  marketPriceSyncedAt: string | null;
  rawPayload: Record<string, unknown> | null;
  syncedAt: string;
}

export interface Game {
  id: number;
  title: string;
  platformId: number;
  region: Region | null;
  purchasePrice: number | null;
  currency: string | null;
  condition: GameCondition | null;
  notes: string | null;
  genres: string[];
  customMeta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  platform?: Platform;
  romFile?: RomFile | null;
  mediaAssets?: MediaAsset[];
  patches?: Patch[];
  saves?: Save[];
  scrapedMetadata?: ScrapedMetadata | null;
}

export interface DashboardStats {
  totalGames: number;
  totalSpent: number;
  byPlatform: Array<{ platformId: number; name: string; count: number; spent: number }>;
}
