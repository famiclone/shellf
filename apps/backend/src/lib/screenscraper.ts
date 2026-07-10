const BASE_URL = "https://www.screenscraper.fr/api2";

interface ScreenScraperConfig {
  devId: string;
  devPassword: string;
  softname: string;
}

function getConfig(): ScreenScraperConfig | null {
  const devId = process.env.SCREENSCRAPER_DEV_ID;
  const devPassword = process.env.SCREENSCRAPER_DEV_PASSWORD;
  const softname = process.env.SCREENSCRAPER_SOFTNAME ?? "shellf";
  if (!devId || !devPassword) return null;
  return { devId, devPassword, softname };
}

export interface ScreenScraperResult {
  externalId: string;
  title: string | null;
  description: string | null;
  coverUrl: string | null;
  rawPayload: Record<string, unknown>;
}

export async function lookupByHash(
  crc: string,
  md5: string,
  sha1: string,
  systemShortName: string,
): Promise<ScreenScraperResult | null> {
  const config = getConfig();
  if (!config) {
    throw new Error("ScreenScraper не налаштовано. Вкажіть SCREENSCRAPER_DEV_ID та SCREENSCRAPER_DEV_PASSWORD");
  }

  const params = new URLSearchParams({
    devid: config.devId,
    devpassword: config.devPassword,
    softname: config.softname,
    output: "json",
    crc: crc.toLowerCase(),
    md5: md5.toLowerCase(),
    sha1: sha1.toLowerCase(),
    systemeid: mapPlatformToSystemId(systemShortName),
  });

  const url = `${BASE_URL}/jeuInfos.php?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ScreenScraper API помилка: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const responseData = data.response as Record<string, unknown> | undefined;
  const jeu = (responseData?.jeu ?? data.jeu) as Record<string, unknown> | undefined;
  if (jeu) {

    const id = String(jeu.id ?? "");
    const noms = jeu.noms as Array<{ region: string; text: string }> | undefined;
    const synopsis = jeu.synopsis as Array<{ text: string }> | undefined;
    const medias = jeu.medias as Array<{ type: string; url: string }> | undefined;

    const title =
      noms?.find((n) => n.region === "wor")?.text ??
      noms?.find((n) => n.region === "eu")?.text ??
      noms?.[0]?.text ??
      (jeu.nom as string | undefined) ??
      null;

    const description = synopsis?.[0]?.text ?? null;
    const coverUrl =
      medias?.find((m) => m.type === "box-2D" || m.type === "ss")?.url ?? null;

    return {
      externalId: id,
      title,
      description,
      coverUrl,
      rawPayload: jeu as Record<string, unknown>,
    };
  }

  return null;
}

function mapPlatformToSystemId(shortName: string): string {
  const map: Record<string, string> = {
    nes: "3",
    famicom: "3",
    snes: "4",
    gb: "9",
    gbc: "10",
    gba: "12",
    megadrive: "1",
    n64: "14",
  };
  return map[shortName] ?? "0";
}
