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

/** PriceCharting price fields that map to item conditions. */
export type PriceChartingPriceKey =
  | "loose"
  | "cib"
  | "newPrice"
  | "boxOnly"
  | "manualOnly";

/**
 * Map Shellf condition → PriceCharting price column.
 * PriceCharting "Loose" = cart/disc only (no box/manual).
 */
export const CONDITION_TO_PRICECHARTING: Record<
  GameCondition,
  PriceChartingPriceKey
> = {
  sealed: "newPrice",
  cib: "cib",
  loose: "loose",
  cart_only: "loose",
  manual_only: "manualOnly",
};

export function pricechartingKeyForCondition(
  condition?: GameCondition | null,
): PriceChartingPriceKey | null {
  if (!condition) return null;
  return CONDITION_TO_PRICECHARTING[condition] ?? null;
}

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

export const REGIONS = ["NTSC-J", "NTSC-U", "PAL", "OTHER"] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABELS: Record<Region, string> = {
  "NTSC-J": "NTSC-J",
  "NTSC-U": "NTSC-U",
  PAL: "PAL",
  OTHER: "Other",
};

/** Map legacy geographic region codes to video standards. */
export const LEGACY_REGION_MAP: Record<string, Region> = {
  JP: "NTSC-J",
  US: "NTSC-U",
  EU: "PAL",
  AU: "PAL",
  KR: "OTHER",
  CN: "OTHER",
  OTHER: "OTHER",
  "NTSC-J": "NTSC-J",
  "NTSC-U": "NTSC-U",
  PAL: "PAL",
};

export const TAG_PRESETS = [
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

export type TagPreset = (typeof TAG_PRESETS)[number];

/** @deprecated Use TAG_PRESETS */
export const GENRE_PRESETS = TAG_PRESETS;
/** @deprecated Use TagPreset */
export type GenrePreset = TagPreset;

/** Trim, drop empties, dedupe case-insensitively (keeps first casing). */
export function normalizeTagNames(names: string[] | null | undefined): string[] {
  if (!names?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
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

/** @deprecated Use normalizeTagNames */
export const normalizeGenres = normalizeTagNames;

export const createTagSchema = z.object({
  name: z.string().min(1).max(64),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export interface Tag {
  id: number;
  name: string;
  slug: string;
  itemCount?: number;
}

export const DEFAULT_KINDS = [
  {
    slug: "game",
    name: "Game",
    isSystem: true,
    features: {
      emulator: true,
      rom: true,
      patches: true,
      saves: true,
      scrape: true,
    },
  },
  { slug: "audio", name: "Audio", isSystem: true, features: {} },
  { slug: "video", name: "Video", isSystem: true, features: {} },
  { slug: "card", name: "Card", isSystem: true, features: {} },
  { slug: "book", name: "Book", isSystem: true, features: {} },
] as const;

/** Fixed item/group type slugs. */
export const KIND_SLUGS = DEFAULT_KINDS.map((k) => k.slug);
export type KindSlug = (typeof DEFAULT_KINDS)[number]["slug"];

/** Map legacy kind slugs onto the fixed set. */
export const LEGACY_KIND_SLUG_MAP: Record<string, KindSlug> = {
  game: "game",
  audio: "audio",
  video: "video",
  card: "card",
  book: "book",
  figure: "card",
  lego: "card",
  disc: "video",
  cassette: "audio",
  other: "game",
};

/** Seed groups for game collections (migrated from old platforms). */
export const DEFAULT_GROUPS = [
  { name: "Nintendo Entertainment System", slug: "nes", emulatorCore: "nes", kindSlug: "game" },
  { name: "Family Computer", slug: "famicom", emulatorCore: "nes", kindSlug: "game" },
  { name: "Super Nintendo", slug: "snes", emulatorCore: "snes", kindSlug: "game" },
  { name: "Game Boy", slug: "gb", emulatorCore: "gb", kindSlug: "game" },
  { name: "Game Boy Color", slug: "gbc", emulatorCore: "gb", kindSlug: "game" },
  { name: "Game Boy Advance", slug: "gba", emulatorCore: "gba", kindSlug: "game" },
  { name: "Sega Mega Drive", slug: "megadrive", emulatorCore: "segaMD", kindSlug: "game" },
  { name: "Nintendo 64", slug: "n64", emulatorCore: "n64", kindSlug: "game" },
] as const;

export type KindFeatures = {
  emulator?: boolean;
  rom?: boolean;
  patches?: boolean;
  saves?: boolean;
  scrape?: boolean;
};

export function kindHasFeature(
  features: KindFeatures | null | undefined,
  feature: keyof KindFeatures,
): boolean {
  return Boolean(features?.[feature]);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}

/**
 * Cover aspect ratios keyed by group slug (legacy platform short names).
 * Values are CSS `width / height` for the card slot.
 */
export const BOX_ART_ASPECT_RATIOS: Record<string, string> = {
  nes: "7 / 10",
  /** Portrait slot — landscape Famicom scans are rotated 90° to fit. */
  famicom: "7 / 9",
  snes: "11 / 15",
  gb: "3 / 5",
  gbc: "3 / 5",
  gba: "9 / 13",
  megadrive: "2 / 3",
  n64: "4 / 5",
};

export const COVER_ROTATIONS = [0, 90, 180, 270] as const;
export type CoverRotation = (typeof COVER_ROTATIONS)[number];

export function normalizeCoverRotation(value: unknown): CoverRotation {
  const n = Number(value);
  if (n === 90 || n === 180 || n === 270) return n;
  return 0;
}

export function nextCoverRotation(current: CoverRotation): CoverRotation {
  const idx = COVER_ROTATIONS.indexOf(normalizeCoverRotation(current));
  return COVER_ROTATIONS[(idx + 1) % COVER_ROTATIONS.length]!;
}

export const DEFAULT_BOX_ART_ASPECT_RATIO = "2 / 3";

export function getBoxArtAspectRatio(slug?: string | null): string {
  if (!slug) return DEFAULT_BOX_ART_ASPECT_RATIO;
  return BOX_ART_ASPECT_RATIOS[slug] ?? DEFAULT_BOX_ART_ASPECT_RATIO;
}

/** Parse CSS aspect like `"7 / 9"` → width/height number. */
export function parseAspectRatio(ratio: string): number | null {
  const m = ratio.trim().match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return null;
  return w / h;
}

/**
 * True when image orientation is roughly the inverse of the platform slot
 * (e.g. slot 7/9 portrait, image 9/7 landscape) → rotate 90°.
 */
export function boxArtNeedsRotation(
  imageWidth: number,
  imageHeight: number,
  expectedAspect: string | number,
  tolerance = 0.22,
): boolean {
  if (!imageWidth || !imageHeight) return false;
  const expected =
    typeof expectedAspect === "number"
      ? expectedAspect
      : parseAspectRatio(expectedAspect);
  if (expected == null || expected <= 0) return false;

  const actual = imageWidth / imageHeight;
  const expectedPortrait = expected < 1 - 0.05;
  const expectedLandscape = expected > 1 + 0.05;
  const actualPortrait = actual < 1 - 0.05;
  const actualLandscape = actual > 1 + 0.05;

  // Need opposite orientation (ignore near-square pairs)
  if (expectedPortrait && !actualLandscape) return false;
  if (expectedLandscape && !actualPortrait) return false;
  if (!expectedPortrait && !expectedLandscape) return false;

  const inverse = 1 / expected;
  const rel = Math.abs(actual - inverse) / inverse;
  return rel <= tolerance;
}

export const kindFeaturesSchema = z.object({
  emulator: z.boolean().optional(),
  rom: z.boolean().optional(),
  patches: z.boolean().optional(),
  saves: z.boolean().optional(),
  scrape: z.boolean().optional(),
});

export const createKindSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(1).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  features: kindFeaturesSchema.optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().optional().nullable(),
  kindId: z.number().int().positive(),
  emulatorCore: z.string().optional().nullable(),
});

export const updateGroupSchema = createGroupSchema.partial();

const itemFieldsSchema = z.object({
  title: z.string().min(1),
  kindId: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
  /** @deprecated Use groupId */
  platformId: z.number().int().positive().optional(),
  region: z.enum(REGIONS).optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  condition: z.enum(GAME_CONDITIONS).optional().nullable(),
  isPirate: z.boolean().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** Main cover rotation in degrees (0, 90, 180, 270). */
  coverRotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
  /** Tag IDs to attach (replaces existing when provided on update). */
  tagIds: z.array(z.number().int().positive()).max(20).optional().nullable(),
  /** Tag names to upsert and attach (merged with tagIds). */
  tags: z.array(z.string().min(1)).max(20).optional().nullable(),
  /** @deprecated Use tags */
  genres: z.array(z.string().min(1)).max(20).optional().nullable(),
  customMeta: z.record(z.unknown()).optional().nullable(),
});

export const createItemSchema = itemFieldsSchema.refine(
  (data) => (data.groupId ?? data.platformId) != null,
  { message: "groupId is required", path: ["groupId"] },
);

export const updateItemSchema = itemFieldsSchema
  .partial()
  .omit({ kindId: true })
  .extend({
    marketPrice: z.number().nonnegative().optional().nullable(),
    /** ScreenScraper / scraped description */
    description: z.string().optional().nullable(),
    /** Scraped cover URL; set null to clear */
    coverUrl: z.string().optional().nullable(),
  });

export type CreateKindInput = z.infer<typeof createKindSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;

/** @deprecated Use DEFAULT_GROUPS */
export const DEFAULT_PLATFORMS = DEFAULT_GROUPS.map((g) => ({
  name: g.name,
  shortName: g.slug,
  emulatorCore: g.emulatorCore,
}));

/** @deprecated Use createGroupSchema */
export const createPlatformSchema = createGroupSchema;
/** @deprecated Use createItemSchema */
export const createGameSchema = createItemSchema;
/** @deprecated Use updateItemSchema */
export const updateGameSchema = updateItemSchema;

export type CreatePlatformInput = CreateGroupInput;
export type CreateGameInput = CreateItemInput;
export type UpdateGameInput = UpdateItemInput;

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const LOCALES = ["en", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export const screenscraperSettingsSchema = z.object({
  softname: z.string().default("shellf"),
  devId: z.string().default(""),
  devPassword: z.string().default(""),
});

export const appSettingsDataSchema = z.object({
  theme: z.enum(THEMES).default("dark"),
  locale: z.enum(LOCALES).default("en"),
  screenscraper: screenscraperSettingsSchema.default({}),
  emulator: z.record(z.unknown()).default({}),
});

export const updateAppSettingsSchema = z.object({
  theme: z.enum(THEMES).optional(),
  locale: z.enum(LOCALES).optional(),
  screenscraper: z
    .object({
      softname: z.string().optional(),
      devId: z.string().optional(),
      devPassword: z.string().optional(),
    })
    .optional(),
  emulator: z.record(z.unknown()).optional(),
});

export type AppSettingsData = z.infer<typeof appSettingsDataSchema>;
export type UpdateAppSettingsInput = z.infer<typeof updateAppSettingsSchema>;

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
  theme: "dark",
  locale: "en",
  screenscraper: {
    softname: "shellf",
    devId: "",
    devPassword: "",
  },
  emulator: {},
};

export interface PublicAppSettings {
  theme: Theme;
  locale: Locale;
  screenscraper: {
    softname: string;
    devId: string;
    configured: boolean;
  };
  emulator: Record<string, unknown>;
}

export interface Kind {
  id: number;
  slug: string;
  name: string;
  isSystem: boolean;
  features: KindFeatures;
}

export interface Group {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  kindId: number | null;
  emulatorCore: string | null;
  itemCount?: number;
  kind?: Kind | null;
}

export interface RomFile {
  id: number;
  itemId: number;
  storagePath: string;
  originalFilename: string;
  crc32: string;
  md5: string;
  sha1: string;
  size: number;
}

export interface MediaAsset {
  id: number;
  itemId: number;
  type: MediaType;
  storagePath: string;
  mimeType: string;
  originalFilename: string;
}

export interface Patch {
  id: number;
  itemId: number;
  name: string;
  format: PatchFormat;
  storagePath: string;
  originalFilename: string;
}

export interface Save {
  id: number;
  itemId: number;
  name: string;
  format: SaveFormat;
  storagePath: string;
  originalFilename: string;
  size: number;
}

export interface PriceChartingData {
  productId: string;
  productName: string;
  consoleName: string;
  loose: number | null;
  cib: number | null;
  newPrice: number | null;
  boxOnly: number | null;
  manualOnly: number | null;
  syncedAt: string;
  url: string;
}

export function priceForCondition(
  prices: Pick<
    PriceChartingData,
    PriceChartingPriceKey
  > | null | undefined,
  condition?: GameCondition | null,
): number | null {
  const key = pricechartingKeyForCondition(condition);
  if (!key || !prices) return null;
  return prices[key] ?? null;
}

export interface ScrapedMetadata {
  id: number;
  itemId: number;
  source: string;
  externalId: string | null;
  title: string | null;
  description: string | null;
  coverUrl: string | null;
  marketPrice: number | null;
  marketPriceSyncedAt: string | null;
  pricecharting: PriceChartingData | null;
  rawPayload: Record<string, unknown> | null;
  syncedAt: string;
}

export interface Item {
  id: number;
  title: string;
  kindId: number;
  groupId: number;
  region: Region | null;
  purchasePrice: number | null;
  currency: string | null;
  condition: GameCondition | null;
  isPirate: boolean;
  notes: string | null;
  /** Main cover art rotation in degrees: 0, 90, 180, or 270. */
  coverRotation: CoverRotation;
  tags?: Tag[];
  /** @deprecated Use tags */
  genres?: string[];
  customMeta: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  kind?: Kind;
  group?: Group;
  romFile?: RomFile | null;
  mediaAssets?: MediaAsset[];
  patches?: Patch[];
  saves?: Save[];
  scrapedMetadata?: ScrapedMetadata | null;
}

/** @deprecated Use Group */
export type Platform = Group & { shortName?: string; gameCount?: number };
/** @deprecated Use Item */
export type Game = Item & { platformId?: number; platform?: Group };

export interface DashboardPricedItem {
  id: number;
  title: string;
  groupId: number;
  groupName: string;
  marketValue: number;
  coverUrl: string | null;
}

export interface DashboardStats {
  totalItems: number;
  totalSpent: number;
  /** Sum of PriceCharting prices matching each item's condition (USD). */
  totalMarketValue: number;
  /** Items that contributed a market price to totalMarketValue. */
  marketPricedItems: number;
  byGroup: Array<{ groupId: number; name: string; count: number; spent: number }>;
  /** Highest PriceCharting values (by item condition). */
  topExpensive: DashboardPricedItem[];
  /** Lowest PriceCharting values (by item condition). */
  topCheapest: DashboardPricedItem[];
  /** @deprecated Use totalItems */
  totalGames?: number;
  /** @deprecated Use byGroup */
  byPlatform?: Array<{ platformId: number; name: string; count: number; spent: number }>;
}
