import type {
  DashboardStats,
  Game,
  Platform,
} from "@shellf/shared";

const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Помилка запиту");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getPlatforms: () => request<Platform[]>("/platforms"),
  getPlatform: (id: number) => request<Platform>(`/platforms/${id}`),
  getDashboard: () => request<DashboardStats>("/platforms/stats/dashboard"),
  getGames: (params?: { platformId?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.platformId) q.set("platformId", String(params.platformId));
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    return request<Game[]>(`/games${qs ? `?${qs}` : ""}`);
  },
  getGame: (id: number) => request<Game>(`/games/${id}`),
  createGame: (data: Record<string, unknown>) =>
    request<Game>("/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateGame: (id: number, data: Record<string, unknown>) =>
    request<Game>(`/games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteGame: (id: number) =>
    request<{ ok: boolean }>(`/games/${id}`, { method: "DELETE" }),
  uploadRom: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<Game>(`/games/${id}/rom`, { method: "POST", body: fd });
  },
  uploadMedia: (id: number, file: File, type: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    return request<unknown>(`/games/${id}/media`, { method: "POST", body: fd });
  },
  getMediaUrl: (gameId: number, assetId: number) =>
    `/api/games/${gameId}/media/${assetId}`,
  getRomDownloadUrl: (id: number, patchId?: number, inline?: boolean) => {
    const q = new URLSearchParams();
    if (patchId) q.set("patchId", String(patchId));
    if (inline) q.set("inline", "1");
    const qs = q.toString();
    return `/api/games/${id}/rom${qs ? `?${qs}` : ""}`;
  },
  getPlayInfo: (id: number, patchId?: number) =>
    request<{ romUrl: string; core: string; title: string }>(
      `/games/${id}/play${patchId ? `?patchId=${patchId}` : ""}`,
    ),
  getPatches: (id: number) =>
    request<Array<{ id: number; name: string; format: string }>>(
      `/games/${id}/patches`,
    ),
  uploadPatch: (id: number, file: File, name?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (name) fd.append("name", name);
    return request<unknown>(`/games/${id}/patches`, { method: "POST", body: fd });
  },
  deletePatch: (gameId: number, patchId: number) =>
    request<{ ok: boolean }>(`/games/${gameId}/patches/${patchId}`, {
      method: "DELETE",
    }),
  scrapeGame: (id: number) =>
    request<Game>(`/games/${id}/scrape`, { method: "POST" }),
};

export function getGameCover(game: Game): string | null {
  const box = game.mediaAssets?.find((m) => m.type === "box");
  if (box) return api.getMediaUrl(game.id, box.id);
  if (game.scrapedMetadata?.coverUrl) return game.scrapedMetadata.coverUrl;
  return null;
}
