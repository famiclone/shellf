import type { GameCondition, Region } from "@shellf/shared";
import { LEGACY_REGION_MAP } from "@shellf/shared";
import { getAppSettingsData } from "./settings";

const BASE_URL = "https://api.screenscraper.fr/api2";

/** ScreenScraper region codes preferred per catalog region (highest first). */
const REGION_SS_CODES: Record<Region, string[]> = {
  "NTSC-J": ["jp", "asi", "kr", "tw", "cn", "wor", "ss"],
  "NTSC-U": ["us", "ame", "ca", "mex", "wor", "ss"],
  PAL: [
    "eu",
    "fr",
    "de",
    "es",
    "sp",
    "it",
    "pt",
    "nl",
    "uk",
    "au",
    "br",
    "se",
    "no",
    "dk",
    "fi",
    "wor",
    "ss",
  ],
  OTHER: ["wor", "ss", "us", "eu", "jp"],
};

/** Regions that conflict with the catalog region — avoid unless nothing else exists. */
const REGION_SS_AVOID: Record<Region, string[]> = {
  "NTSC-J": ["us", "ame", "ca", "mex", "eu", "fr", "de", "uk", "es", "sp", "it", "au", "br"],
  "NTSC-U": ["jp", "asi", "kr", "tw", "cn"],
  PAL: ["jp", "asi", "kr", "tw", "cn", "us", "ame"],
  OTHER: [],
};

/** Aliases → ScreenScraper short codes. */
const SS_REGION_ALIASES: Record<string, string> = {
  jap: "jp",
  jpn: "jp",
  japan: "jp",
  usa: "us",
  america: "ame",
  world: "wor",
  spain: "sp",
  esp: "sp",
};

/** Box / packaging art. */
const BOX_MEDIA_TYPES = ["box-2D", "box-2D-side", "box-3D"] as const;

/** Bare cart / disc (ScreenScraper "support"). */
const CART_MEDIA_TYPES = [
  "support-2D",
  "support-2D-photo",
  "support",
  "cart",
] as const;

type CoverKind = "box" | "cart" | "none";

/**
 * Which cover art to scrape based on item condition.
 * - cart_only / loose → cartridge
 * - cib / sealed / unset → box art
 * - manual_only → no cover
 */
function coverKindForCondition(condition?: GameCondition | string | null): CoverKind {
  switch (condition) {
    case "cart_only":
    case "loose":
      return "cart";
    case "manual_only":
      return "none";
    case "cib":
    case "sealed":
    default:
      return "box";
  }
}

interface ScreenScraperConfig {
  devId: string;
  devPassword: string;
  softname: string;
}

async function getConfig(): Promise<ScreenScraperConfig | null> {
  const settings = await getAppSettingsData();
  const fromDb = settings.screenscraper;
  const devId = fromDb.devId || process.env.SCREENSCRAPER_DEV_ID || "";
  const devPassword =
    fromDb.devPassword || process.env.SCREENSCRAPER_DEV_PASSWORD || "";
  const softname =
    fromDb.softname ||
    process.env.SCREENSCRAPER_SOFTNAME ||
    "shellf";

  if (!devId || !devPassword) return null;
  return { devId, devPassword, softname };
}

export interface ScreenScraperResult {
  externalId: string;
  title: string | null;
  description: string | null;
  coverUrl: string | null;
  genres: string[];
  rawPayload: Record<string, unknown>;
}

/** ScreenScraper often returns a single object instead of a one-element array. */
function asArray<T>(value: unknown): T[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "object") return Object.values(value as Record<string, T>);
  return [value as T];
}

function parseGenres(jeu: Record<string, unknown>): string[] {
  const genres = asArray<{
    id?: string | number;
    noms?: unknown;
    nom_en?: string;
    nom_fr?: string;
  }>(jeu.genres);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of genres) {
    const noms = asArray<{ langue?: string; text?: string }>(g.noms);
    const text =
      noms.find((n) => n.langue === "en")?.text ??
      noms.find((n) => n.langue === "wor")?.text ??
      noms[0]?.text ??
      g.nom_en ??
      g.nom_fr ??
      null;
    if (!text) continue;
    const tag = text.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function extractApiError(data: Record<string, unknown>): string | null {
  const response = data.response as Record<string, unknown> | undefined;
  const erreur = response?.erreur ?? data.erreur;
  if (typeof erreur === "string" && erreur.trim()) return erreur.trim();
  return null;
}

export interface LookupByHashOptions {
  crc: string;
  md5: string;
  sha1: string;
  systemShortName: string;
  romFilename?: string;
  romSize?: number;
  /** Item catalog region — used to pick box art / title. */
  region?: Region | string | null;
  /** Item condition — picks cart vs box vs no cover. */
  condition?: GameCondition | string | null;
}

type SsMedia = {
  type?: string;
  url?: string;
  region?: string;
  parent?: string;
};

type SsName = {
  region?: string;
  text?: string;
};

const REGIONS_SET = new Set<string>(["NTSC-J", "NTSC-U", "PAL", "OTHER"]);

function normalizeCatalogRegion(region?: Region | string | null): Region {
  if (!region) return "OTHER";
  if (LEGACY_REGION_MAP[region]) return LEGACY_REGION_MAP[region]!;
  if (REGIONS_SET.has(region)) return region as Region;
  return "OTHER";
}

function normalizeSsRegionCode(raw: string): string {
  const code = raw.trim().toLowerCase();
  if (!code) return "";
  return SS_REGION_ALIASES[code] ?? code;
}

function regionFromMediaUrl(url: string): string {
  try {
    const u = new URL(url);
    const q = u.searchParams.get("region");
    if (q) return normalizeSsRegionCode(q);
  } catch {
    // ignore invalid URL
  }
  const pathHit = url.match(
    /(?:^|[/_-])(jp|us|eu|wor|ss|fr|de|uk|asi|ame|kr|tw|cn|au|br)(?:[_./?-]|$)/i,
  );
  return pathHit?.[1] ? normalizeSsRegionCode(pathHit[1]) : "";
}

function mediaRegionCodes(m: SsMedia): string[] {
  const raw = m.region != null && String(m.region).trim()
    ? String(m.region)
    : m.url
      ? regionFromMediaUrl(m.url)
      : "";
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,|;/]/)
        .map((p) => normalizeSsRegionCode(p))
        .filter(Boolean),
    ),
  ];
}

function isGameLevelMedia(m: SsMedia): boolean {
  // ScreenScraper attaches media to "jeu" (game) or sometimes omits parent.
  // Skip rom-specific media that can point at the wrong regional clone.
  const parent = (m.parent ?? "").trim().toLowerCase();
  return !parent || parent === "jeu";
}

/**
 * Strict region-first media pick (same idea as sselph/scraper):
 * 1) preferred region codes in order × media types
 * 2) unscoped (empty region) — only if no conflicting labeled media stolen the slot
 * 3) non-conflicting regions
 * 4) anything left
 */
function pickCoverUrl(
  medias: SsMedia[],
  mediaTypes: readonly string[],
  region?: Region | string | null,
  extraPreferred: string[] = [],
): string | null {
  const catalog = normalizeCatalogRegion(region);
  const preferred = [
    ...new Set(
      [...extraPreferred, ...REGION_SS_CODES[catalog]].map(normalizeSsRegionCode).filter(Boolean),
    ),
  ];
  const avoid = new Set(REGION_SS_AVOID[catalog]);
  const typeRank = new Map(mediaTypes.map((t, i) => [t, i]));

  const candidates = medias
    .filter(
      (m) =>
        typeof m.url === "string" &&
        m.url.length > 0 &&
        typeRank.has(m.type ?? "") &&
        isGameLevelMedia(m),
    )
    .map((m) => ({
      url: m.url!,
      type: m.type!,
      codes: mediaRegionCodes(m),
      typeIdx: typeRank.get(m.type!)!,
    }));

  if (!candidates.length) return null;

  const find = (pred: (c: (typeof candidates)[number]) => boolean) => {
    let best: (typeof candidates)[number] | null = null;
    for (const c of candidates) {
      if (!pred(c)) continue;
      if (!best || c.typeIdx < best.typeIdx) best = c;
    }
    return best?.url ?? null;
  };

  for (const code of preferred) {
    const hit = find((c) => c.codes.includes(code));
    if (hit) return hit;
  }

  // Unscoped: only accept when it doesn't look like a foreign-only leftover.
  // Prefer labeled non-avoid regions first if any exist.
  const labeledSafe = find(
    (c) => c.codes.length > 0 && c.codes.every((code) => !avoid.has(code)),
  );
  if (labeledSafe) return labeledSafe;

  const unscoped = find((c) => c.codes.length === 0);
  if (unscoped) return unscoped;

  return find(() => true);
}

function pickTitle(
  noms: SsName[],
  region?: Region | string | null,
  fallback?: string | null,
): string | null {
  const preferred = REGION_SS_CODES[normalizeCatalogRegion(region)];
  for (const code of preferred) {
    const hit = noms.find((n) => {
      const codes = String(n.region ?? "")
        .split(/[,|;/]/)
        .map((p) => normalizeSsRegionCode(p));
      return codes.includes(code) && n.text?.trim();
    });
    if (hit?.text) return hit.text.trim();
  }
  const any = noms.find((n) => n.text?.trim());
  return any?.text?.trim() ?? fallback ?? null;
}

/** Regions declared on the ROM that matched our hashes. */
function romRegionCodes(
  jeu: Record<string, unknown>,
  opts: LookupByHashOptions,
): string[] {
  const roms = asArray<Record<string, unknown>>(jeu.roms);
  const sha1 = opts.sha1.toLowerCase();
  const md5 = opts.md5.toLowerCase();
  const crc = opts.crc.toLowerCase();

  const matched =
    roms.find((r) => String(r.romsha1 ?? r.sha1 ?? "").toLowerCase() === sha1) ??
    roms.find((r) => String(r.rommd5 ?? r.md5 ?? "").toLowerCase() === md5) ??
    roms.find((r) => String(r.romcrc ?? r.crc ?? "").toLowerCase() === crc) ??
    null;

  if (!matched) return [];

  const raw =
    matched.romregions ??
    matched.regions ??
    (matched.regions_shortname as unknown) ??
    "";

  if (typeof raw === "string") {
    return raw
      .split(/[,|;/]/)
      .map((p) => normalizeSsRegionCode(p))
      .filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.map((p) => normalizeSsRegionCode(String(p))).filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    const short = (raw as { regions_shortname?: unknown }).regions_shortname;
    return asArray<string>(short).map((p) => normalizeSsRegionCode(String(p))).filter(Boolean);
  }
  return [];
}

export async function lookupByHash(
  crcOrOpts: string | LookupByHashOptions,
  md5?: string,
  sha1?: string,
  systemShortName?: string,
): Promise<ScreenScraperResult | null> {
  const opts: LookupByHashOptions =
    typeof crcOrOpts === "string"
      ? {
          crc: crcOrOpts,
          md5: md5!,
          sha1: sha1!,
          systemShortName: systemShortName ?? "",
        }
      : crcOrOpts;

  const config = await getConfig();
  if (!config) {
    throw new Error(
      "ScreenScraper не налаштовано. Додайте credentials у Settings → Scraper або SCREENSCRAPER_DEV_ID / SCREENSCRAPER_DEV_PASSWORD",
    );
  }

  const params = new URLSearchParams({
    devid: config.devId,
    devpassword: config.devPassword,
    softname: config.softname,
    output: "json",
    crc: opts.crc.toLowerCase(),
    md5: opts.md5.toLowerCase(),
    sha1: opts.sha1.toLowerCase(),
    systemeid: mapPlatformToSystemId(opts.systemShortName),
    romtype: "rom",
  });

  if (opts.romFilename) {
    params.set("romnom", opts.romFilename);
  }
  if (opts.romSize != null && Number.isFinite(opts.romSize)) {
    params.set("romtaille", String(opts.romSize));
  }

  const url = `${BASE_URL}/jeuInfos.php?${params}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Не вдалося з’єднатися з ScreenScraper: ${detail}`);
  }

  const text = await response.text();
  if (!response.ok) {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 240);
    if (/sandbox network policy|not on allow list/i.test(snippet)) {
      throw new Error(
        "Вихідний доступ до api.screenscraper.fr заблоковано середовищем (sandbox/firewall). Запустіть backend з повним мережевим доступом або дозвольте HTTPS з контейнера.",
      );
    }
    if (response.status === 403) {
      throw new Error(
        `ScreenScraper відхилив запит (HTTP 403). Перевірте devid/devpassword/softname і вихідний доступ сервера до api.screenscraper.fr.${snippet ? ` Відповідь: ${snippet}` : ""}`,
      );
    }
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `ScreenScraper повернув не-JSON (HTTP ${response.status}): ${text.slice(0, 180)}`,
    );
  }

  const apiError = extractApiError(data);
  if (apiError) {
    throw new Error(`ScreenScraper: ${apiError}`);
  }

  if (!response.ok) {
    throw new Error(`ScreenScraper API помилка: ${response.status}`);
  }

  const responseData = data.response as Record<string, unknown> | undefined;
  const jeu = (responseData?.jeu ?? data.jeu) as Record<string, unknown> | undefined;
  if (!jeu) return null;

  const id = String(jeu.id ?? "");
  const noms = asArray<SsName>(jeu.noms);
  const synopsis = asArray<{ text?: string; langue?: string }>(jeu.synopsis);
  const medias = asArray<SsMedia>(jeu.medias);
  const romRegions = romRegionCodes(jeu, opts);

  const title = pickTitle(
    noms,
    opts.region,
    typeof jeu.nom === "string" ? jeu.nom : null,
  );

  const description =
    synopsis.find((s) => s.langue === "en")?.text ??
    synopsis.find((s) => s.langue === "wor")?.text ??
    synopsis[0]?.text ??
    null;

  const coverKind = coverKindForCondition(opts.condition);
  let coverUrl: string | null = null;
  if (coverKind === "cart") {
    coverUrl =
      pickCoverUrl(medias, CART_MEDIA_TYPES, opts.region, romRegions) ??
      pickCoverUrl(medias, BOX_MEDIA_TYPES, opts.region, romRegions);
  } else if (coverKind === "box") {
    coverUrl = pickCoverUrl(medias, BOX_MEDIA_TYPES, opts.region, romRegions);
  }

  // Keep a trimmed payload — full media lists can be huge
  const rawPayload: Record<string, unknown> = {
    id: jeu.id,
    noms: jeu.noms,
    synopsis: jeu.synopsis,
    genres: jeu.genres,
    systemeid: jeu.systemeid,
    romRegions,
    coverMedia: medias
      .filter((m) => BOX_MEDIA_TYPES.includes(m.type as (typeof BOX_MEDIA_TYPES)[number]) || CART_MEDIA_TYPES.includes(m.type as (typeof CART_MEDIA_TYPES)[number]))
      .slice(0, 40)
      .map((m) => ({
        type: m.type,
        region: m.region ?? null,
        parent: m.parent ?? null,
        codes: mediaRegionCodes(m),
        url: m.url,
      })),
  };

  return {
    externalId: id,
    title,
    description,
    coverUrl,
    genres: parseGenres(jeu),
    rawPayload,
  };
}

function mapPlatformToSystemId(shortName: string): string {
  const key = shortName.trim().toLowerCase();
  const map: Record<string, string> = {
    nes: "3",
    famicom: "3",
    snes: "4",
    "super-nintendo": "4",
    gb: "9",
    "game-boy": "9",
    gbc: "10",
    "game-boy-color": "10",
    gba: "12",
    "game-boy-advance": "12",
    megadrive: "1",
    genesis: "1",
    "mega-drive": "1",
    n64: "14",
    "nintendo-64": "14",
    nds: "15",
    psp: "61",
    psx: "57",
    ps1: "57",
    dreamcast: "23",
    saturn: "22",
    ngp: "25",
    ngpc: "82",
    wonderswan: "45",
    wonderswancolor: "46",
  };
  return map[key] ?? "0";
}
