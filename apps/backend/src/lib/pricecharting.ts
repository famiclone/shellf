import type { PriceChartingData, Region } from "@shellf/shared";

type ConsoleVariant = {
  ntscU: string;
  pal: string;
  ntscJ: string;
};

/** Display names as shown on PriceCharting search results. */
const CONSOLE_BY_SLUG: Record<string, ConsoleVariant> = {
  nes: { ntscU: "NES", pal: "PAL NES", ntscJ: "Famicom" },
  famicom: { ntscU: "Famicom", pal: "Famicom", ntscJ: "Famicom" },
  snes: {
    ntscU: "Super Nintendo",
    pal: "PAL Super Nintendo",
    ntscJ: "Super Famicom",
  },
  gb: { ntscU: "GameBoy", pal: "PAL GameBoy", ntscJ: "JP GameBoy" },
  gbc: {
    ntscU: "GameBoy Color",
    pal: "PAL GameBoy Color",
    ntscJ: "JP GameBoy Color",
  },
  gba: {
    ntscU: "GameBoy Advance",
    pal: "PAL GameBoy Advance",
    ntscJ: "JP GameBoy Advance",
  },
  megadrive: {
    ntscU: "Sega Genesis",
    pal: "PAL Mega Drive",
    ntscJ: "JP Mega Drive",
  },
  n64: {
    ntscU: "Nintendo 64",
    pal: "PAL Nintendo 64",
    ntscJ: "JP Nintendo 64",
  },
};

/** URL path segments under /game/{console}/… */
const CONSOLE_PATH_BY_SLUG: Record<string, ConsoleVariant> = {
  nes: { ntscU: "nes", pal: "pal-nes", ntscJ: "famicom" },
  famicom: { ntscU: "famicom", pal: "famicom", ntscJ: "famicom" },
  snes: {
    ntscU: "super-nintendo",
    pal: "pal-super-nintendo",
    ntscJ: "super-famicom",
  },
  gb: { ntscU: "gameboy", pal: "pal-gameboy", ntscJ: "jp-gameboy" },
  gbc: {
    ntscU: "gameboy-color",
    pal: "pal-gameboy-color",
    ntscJ: "jp-gameboy-color",
  },
  gba: {
    ntscU: "gameboy-advance",
    pal: "pal-gameboy-advance",
    ntscJ: "jp-gameboy-advance",
  },
  megadrive: {
    ntscU: "sega-genesis",
    pal: "pal-sega-mega-drive",
    ntscJ: "jp-sega-mega-drive",
  },
  n64: {
    ntscU: "nintendo-64",
    pal: "pal-nintendo-64",
    ntscJ: "jp-nintendo-64",
  },
};

function pickVariant(variant: ConsoleVariant, region?: Region | null): string {
  if (region === "PAL") return variant.pal;
  if (region === "NTSC-J") return variant.ntscJ;
  return variant.ntscU;
}

export function consoleNameForGroupSlug(
  slug?: string | null,
  region?: Region | null,
): string | null {
  if (!slug) return null;
  const variant = CONSOLE_BY_SLUG[slug];
  if (!variant) return null;
  return pickVariant(variant, region);
}

function consolePathForGroupSlug(
  slug?: string | null,
  region?: Region | null,
): string | null {
  if (!slug) return null;
  const variant = CONSOLE_PATH_BY_SLUG[slug];
  if (!variant) return null;
  return pickVariant(variant, region);
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export class PriceChartingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceChartingError";
  }
}

const UA =
  "Mozilla/5.0 (compatible; Shellf/0.1; +https://github.com/famiclone/shellf) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(
  url: string,
): Promise<{ html: string; finalUrl: string; ok: boolean; status: number }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  const html = await res.text();
  return { html, finalUrl: res.url, ok: res.ok, status: res.status };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#43;/g, "+")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseDollarPrice(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const cleaned = decodeEntities(raw).replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** First `.price.js-price` text inside an element with the given id. */
function priceFromCell(html: string, cellId: string): number | null {
  const cellRe = new RegExp(
    `<td[^>]*\\bid=["']${cellId}["'][^>]*>([\\s\\S]*?)</td>`,
    "i",
  );
  const cell = html.match(cellRe)?.[1];
  if (!cell) return null;
  const priceSpan =
    cell.match(
      /<span[^>]*class=["'][^"']*\bprice\b[^"']*js-price[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    ) ??
    cell.match(
      /<span[^>]*class=["'][^"']*\bjs-price\b[^"']*\bprice\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    );
  if (priceSpan) return parseDollarPrice(priceSpan[1]);
  const any = cell.match(
    /<span[^>]*class=["'][^"']*\bjs-price\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  return parseDollarPrice(any?.[1]);
}

function isProductPage(html: string): boolean {
  return (
    /id=["']product_name["']/i.test(html) && /id=["']price_data["']/i.test(html)
  );
}

function parseProductPage(html: string, pageUrl: string): PriceChartingData {
  const nameBlock = html.match(
    /<h1[^>]*\bid=["']product_name["'][^>]*title=["'](\d+)["'][^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (!nameBlock) {
    throw new PriceChartingError("Не вдалося розпарсити сторінку PriceCharting");
  }

  const productId = nameBlock[1]!;
  const inner = nameBlock[2]!;
  const consoleMatch = inner.match(
    /<a[^>]*href=["']\/console\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i,
  );
  const consoleName = consoleMatch ? decodeEntities(consoleMatch[1]!) : "";
  const productName = decodeEntities(inner.replace(/<[^>]+>/g, " "));

  const loose = priceFromCell(html, "used_price");
  const cib = priceFromCell(html, "complete_price");
  const newPrice = priceFromCell(html, "new_price");
  const boxOnly = priceFromCell(html, "box_only_price");
  const manualOnly = priceFromCell(html, "manual_only_price");

  if (
    loose == null &&
    cib == null &&
    newPrice == null &&
    boxOnly == null &&
    manualOnly == null
  ) {
    throw new PriceChartingError("На сторінці PriceCharting немає цін");
  }

  return {
    productId,
    productName,
    consoleName,
    loose,
    cib,
    newPrice,
    boxOnly,
    manualOnly,
    syncedAt: new Date().toISOString(),
    url: pageUrl.split("?")[0]!,
  };
}

type SearchHit = {
  productId: string;
  href: string;
  title: string;
  consoleName: string;
};

function parseSearchHits(html: string): SearchHit[] {
  const hits: SearchHit[] = [];
  const rowRe =
    /<tr[^>]*(?:id=["']product-(\d+)["']|data-product=["'](\d+)["'])[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html)) !== null) {
    const productId = row[1] || row[2] || "";
    const body = row[3] || "";
    const link = body.match(
      /<td[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!link) continue;
    const href = link[1]!.startsWith("http")
      ? link[1]!
      : `https://www.pricecharting.com${link[1]!}`;
    const title = decodeEntities(link[2]!.replace(/<[^>]+>/g, " "));
    const consoleInTitle = body.match(
      /class=["'][^"']*console-in-title[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    );
    const consoleCell = body.match(
      /<td[^>]*class=["'][^"']*\bconsole\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
    );
    const consoleName = decodeEntities(
      (consoleInTitle?.[1] || consoleCell?.[1] || "").replace(/<[^>]+>/g, " "),
    );
    hits.push({ productId, href, title, consoleName });
  }
  return hits;
}

function scoreHit(
  hit: SearchHit,
  title: string,
  consoleName?: string | null,
  consolePath?: string | null,
): number {
  let score = 0;
  const hitTitle = normalizeText(hit.title);
  const wantTitle = normalizeText(title);

  if (hitTitle === wantTitle) score += 100;
  else if (hitTitle.startsWith(wantTitle) || wantTitle.startsWith(hitTitle)) {
    score += 55;
  } else if (hitTitle.includes(wantTitle)) score += 25;

  if (consoleName) {
    const hitConsole = normalizeText(hit.consoleName);
    const wantConsole = normalizeText(consoleName);
    if (hitConsole === wantConsole) score += 90;
    else if (
      hitConsole.startsWith(wantConsole) ||
      wantConsole.startsWith(hitConsole)
    ) {
      score += 45;
    }
  }

  if (consolePath) {
    const pathNeedle = `/${consolePath}/`;
    if (hit.href.toLowerCase().includes(pathNeedle)) score += 70;
  }

  return score;
}

function pickBestHit(
  hits: SearchHit[],
  title: string,
  consoleName?: string | null,
  consolePath?: string | null,
): SearchHit | null {
  if (!hits.length) return null;
  let best: SearchHit | null = null;
  let bestScore = -1;
  for (const hit of hits) {
    const score = scoreHit(hit, title, consoleName, consolePath);
    if (score > bestScore) {
      best = hit;
      bestScore = score;
    }
  }
  // Require at least a weak title match when we have many noisy card results
  if (best && bestScore < 25) return null;
  return best;
}

/**
 * Look up market prices by scraping public PriceCharting search + product pages.
 * Region selects NTSC-U / PAL / JP console variants on PriceCharting.
 */
export async function lookupProduct(opts: {
  title: string;
  consoleName?: string | null;
  consolePath?: string | null;
  groupSlug?: string | null;
  region?: Region | null;
}): Promise<PriceChartingData> {
  const title = opts.title.trim();
  if (!title) {
    throw new PriceChartingError("Немає назви для пошуку в PriceCharting");
  }

  const consoleName =
    opts.consoleName ??
    consoleNameForGroupSlug(opts.groupSlug, opts.region);
  const consolePath =
    opts.consolePath ??
    consolePathForGroupSlug(opts.groupSlug, opts.region);

  // Prefer direct regional URL when we can build it
  if (consolePath) {
    const directUrl = `https://www.pricecharting.com/game/${consolePath}/${slugifyTitle(title)}`;
    const direct = await fetchHtml(directUrl);
    if (direct.ok && isProductPage(direct.html)) {
      return parseProductPage(direct.html, direct.finalUrl);
    }
  }

  const q = [title, consoleName].filter(Boolean).join(" ");
  const searchUrl = new URL("https://www.pricecharting.com/search-products");
  searchUrl.searchParams.set("q", q);
  searchUrl.searchParams.set("type", "prices");

  const search = await fetchHtml(searchUrl.toString());
  if (!search.ok) {
    throw new PriceChartingError(`PriceCharting HTTP ${search.status}`);
  }

  if (isProductPage(search.html)) {
    return parseProductPage(search.html, search.finalUrl);
  }

  const hits = parseSearchHits(search.html);
  const best = pickBestHit(hits, title, consoleName, consolePath);
  if (!best) {
    throw new PriceChartingError("Айтем не знайдено в PriceCharting");
  }

  const product = await fetchHtml(best.href);
  if (!product.ok || !isProductPage(product.html)) {
    throw new PriceChartingError("Не вдалося відкрити сторінку PriceCharting");
  }
  return parseProductPage(product.html, product.finalUrl);
}
