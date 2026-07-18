import type {
  CreateGroupInput,
  CreateItemInput,
  CreateKindInput,
  CreateTagInput,
  DashboardStats,
  Game,
  Group,
  Item,
  Kind,
  Platform,
  PublicAppSettings,
  Tag,
  UpdateAppSettingsInput,
  UpdateGroupInput,
  UpdateItemInput,
} from "@shellf/shared";

const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const raw = (err as { error?: unknown }).error;
    const message =
      typeof raw === "string"
        ? raw
        : raw != null
          ? JSON.stringify(raw)
          : res.statusText || "Request failed";
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getSettings: () => request<PublicAppSettings>("/settings"),
  updateSettings: (data: UpdateAppSettingsInput) =>
    request<PublicAppSettings>("/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getKinds: () => request<Kind[]>("/kinds"),
  createKind: (data: CreateKindInput) =>
    request<Kind>("/kinds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getGroups: (params?: { kindId?: number }) => {
    const q = new URLSearchParams();
    if (params?.kindId) q.set("kindId", String(params.kindId));
    const qs = q.toString();
    return request<Group[]>(`/groups${qs ? `?${qs}` : ""}`);
  },
  getGroup: (id: number) => request<Group>(`/groups/${id}`),
  createGroup: (data: CreateGroupInput) =>
    request<Group>("/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateGroup: (id: number, data: UpdateGroupInput) =>
    request<Group>(`/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getDashboard: () => request<DashboardStats>("/groups/stats/dashboard"),

  getTags: () => request<Tag[]>("/tags"),
  createTag: (data: CreateTagInput) =>
    request<Tag>("/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteTag: (id: number) =>
    request<{ ok: boolean }>(`/tags/${id}`, { method: "DELETE" }),

  getItems: (params?: {
    groupId?: number;
    platformId?: number;
    search?: string;
    tag?: string;
    tagId?: number;
  }) => {
    const q = new URLSearchParams();
    const groupId = params?.groupId ?? params?.platformId;
    if (groupId) q.set("groupId", String(groupId));
    if (params?.search) q.set("search", params.search);
    if (params?.tag) q.set("tag", params.tag);
    if (params?.tagId) q.set("tagId", String(params.tagId));
    const qs = q.toString();
    return request<Item[]>(`/items${qs ? `?${qs}` : ""}`);
  },
  getItem: (id: number) => request<Item>(`/items/${id}`),
  createItem: (data: CreateItemInput | Record<string, unknown>) =>
    request<Item>("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateItem: (id: number, data: UpdateItemInput | Record<string, unknown>) =>
    request<Item>(`/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteItem: (id: number) =>
    request<{ ok: boolean }>(`/items/${id}`, { method: "DELETE" }),
  deleteRom: (id: number) =>
    request<{ ok: boolean }>(`/items/${id}/rom`, { method: "DELETE" }),
  uploadRom: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<Item>(`/items/${id}/rom`, { method: "POST", body: fd });
  },
  uploadMedia: (id: number, file: File, type: string, replace?: boolean) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    const qs = replace ? "?replace=true" : "";
    return request<unknown>(`/items/${id}/media${qs}`, { method: "POST", body: fd });
  },
  deleteMedia: (itemId: number, assetId: number) =>
    request<{ ok: boolean }>(`/items/${itemId}/media/${assetId}`, {
      method: "DELETE",
    }),
  /** Clears box media and scraped coverUrl so no ScreenScraper fallback remains. */
  clearCover: (id: number) =>
    request<Item>(`/items/${id}/cover`, { method: "DELETE" }),
  getMediaUrl: (itemId: number, assetId: number) =>
    `/api/items/${itemId}/media/${assetId}`,
  getRomDownloadUrl: (id: number, patchId?: number, inline?: boolean) => {
    const q = new URLSearchParams();
    if (patchId) q.set("patchId", String(patchId));
    if (inline) q.set("inline", "1");
    const qs = q.toString();
    return `/api/items/${id}/rom${qs ? `?${qs}` : ""}`;
  },
  getPackDownloadUrl: (id: number) => `/api/items/${id}/pack`,
  getPlayInfo: (id: number, patchId?: number) =>
    request<{ romUrl: string; core: string; title: string }>(
      `/items/${id}/play${patchId ? `?patchId=${patchId}` : ""}`,
    ),
  getPatches: (id: number) =>
    request<Array<{ id: number; name: string; format: string }>>(
      `/items/${id}/patches`,
    ),
  uploadPatch: (id: number, file: File, name?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (name) fd.append("name", name);
    return request<unknown>(`/items/${id}/patches`, { method: "POST", body: fd });
  },
  deletePatch: (itemId: number, patchId: number) =>
    request<{ ok: boolean }>(`/items/${itemId}/patches/${patchId}`, {
      method: "DELETE",
    }),
  getSaves: (id: number) =>
    request<
      Array<{
        id: number;
        name: string;
        format: string;
        originalFilename: string;
        size: number;
      }>
    >(`/items/${id}/saves`),
  uploadSave: (id: number, file: File, name?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (name) fd.append("name", name);
    return request<unknown>(`/items/${id}/saves`, { method: "POST", body: fd });
  },
  deleteSave: (itemId: number, saveId: number) =>
    request<{ ok: boolean }>(`/items/${itemId}/saves/${saveId}`, {
      method: "DELETE",
    }),
  getSaveDownloadUrl: (itemId: number, saveId: number) =>
    `/api/items/${itemId}/saves/${saveId}`,
  scrapeItem: (id: number) =>
    request<Item>(`/items/${id}/scrape`, { method: "POST" }),
  syncItemPrices: (id: number) =>
    request<Item>(`/items/${id}/prices/sync`, { method: "POST" }),

  /** @deprecated Use getGroups */
  getPlatforms: () => api.getGroups() as Promise<Platform[]>,
  /** @deprecated Use getGroup */
  getPlatform: (id: number) => api.getGroup(id) as Promise<Platform>,
  /** @deprecated Use getItems */
  getGames: (params?: { platformId?: number; groupId?: number; search?: string }) =>
    api.getItems(params) as Promise<Game[]>,
  /** @deprecated Use getItem */
  getGame: (id: number) => api.getItem(id) as Promise<Game>,
  /** @deprecated Use createItem */
  createGame: (data: Record<string, unknown>) =>
    api.createItem(data) as Promise<Game>,
  /** @deprecated Use updateItem */
  updateGame: (id: number, data: Record<string, unknown>) =>
    api.updateItem(id, data) as Promise<Game>,
  /** @deprecated Use deleteItem */
  deleteGame: (id: number) => api.deleteItem(id),
  /** @deprecated Use scrapeItem */
  scrapeGame: (id: number) => api.scrapeItem(id) as Promise<Game>,
};

export function getItemCover(item: Item | Game): string | null {
  const box = item.mediaAssets?.find((m) => m.type === "box");
  if (box) return api.getMediaUrl(item.id, box.id);
  if (item.scrapedMetadata?.coverUrl) return item.scrapedMetadata.coverUrl;
  return null;
}

export function getItemTagList(item: Item | Game): Array<{ name: string; slug?: string }> {
  if (item.tags?.length) {
    return item.tags.map((t) => ({ name: t.name, slug: t.slug }));
  }
  return (item.genres ?? []).map((name) => ({ name }));
}

/** @deprecated Use getItemCover */
export const getGameCover = getItemCover;
