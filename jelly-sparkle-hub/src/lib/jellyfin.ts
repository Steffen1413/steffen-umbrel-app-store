// Jellyfin API helper functions

export interface JellyfinConfig {
  serverUrl: string;
  apiKey?: string;
  userId?: string;
  accessToken?: string;
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  Overview?: string;
  Type: string;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  RunTimeTicks?: number;
  CommunityRating?: number;
  OfficialRating?: string;
  Genres?: string[];
  ProductionYear?: number;
  Status?: string;
  SeriesName?: string;
  UserData?: {
    Played: boolean;
    PlaybackPositionTicks: number;
    IsFavorite: boolean;
  };
}

export interface JellyfinSession {
  Id: string;
  UserName: string;
  NowPlayingItem?: JellyfinItem;
  LastActivityDate?: string;
}

export interface JellyfinUser {
  Id: string;
  Name: string;
}

const CLIENT_NAME = "Jellyfin Discovery Hub";
const DEVICE_NAME = "Web Browser";
const DEVICE_ID = "jellyfin-discovery-hub-" + Math.random().toString(36).substring(7);
const CLIENT_VERSION = "1.0.0";

function getAuthHeader(accessToken?: string): string {
  let header = `MediaBrowser Client="${CLIENT_NAME}", Device="${DEVICE_NAME}", DeviceId="${DEVICE_ID}", Version="${CLIENT_VERSION}"`;
  if (accessToken) {
    header += `, Token="${accessToken}"`;
  }
  return header;
}

export function buildHeaders(config: JellyfinConfig): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Emby-Authorization": getAuthHeader(config.accessToken),
  };
}

export function baseUrl(config: JellyfinConfig): string {
  return config.serverUrl.replace(/\/+$/, "");
}

export async function authenticateByName(
  serverUrl: string,
  username: string,
  password: string
): Promise<{ userId: string; accessToken: string; serverName: string }> {
  const url = `${serverUrl.replace(/\/+$/, "")}/Users/AuthenticateByName`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": getAuthHeader(),
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 401 ? "Invalid username or password" : `Authentication failed: ${text}`);
  }

  const data = await res.json();
  return {
    userId: data.User.Id,
    accessToken: data.AccessToken,
    serverName: data.ServerId,
  };
}

export async function getRecentlyAdded(config: JellyfinConfig, type?: "Movie" | "Series", limit = 20): Promise<JellyfinItem[]> {
  const params = new URLSearchParams({
    Limit: limit.toString(),
    Fields: "Overview,Genres,CommunityRating,OfficialRating",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Backdrop",
    SortBy: "DateCreated",
    SortOrder: "Descending",
  });
  if (type) params.set("IncludeItemTypes", type);

  const res = await fetch(`${baseUrl(config)}/Users/${config.userId}/Items/Latest?${params}`, {
    headers: buildHeaders(config),
  });
  if (!res.ok) throw new Error("Failed to fetch recently added");
  return res.json();
}

export async function getItemsByGenre(config: JellyfinConfig, genre: string, type?: "Movie" | "Series", limit = 40): Promise<{ Items: JellyfinItem[] }> {
  const params = new URLSearchParams({
    Genres: genre,
    Recursive: "true",
    Fields: "Overview,Genres,CommunityRating,OfficialRating",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Backdrop",
    SortBy: "CommunityRating",
    SortOrder: "Descending",
    Limit: limit.toString(),
  });
  if (type) params.set("IncludeItemTypes", type);
  else params.set("IncludeItemTypes", "Movie,Series");

  const res = await fetch(`${baseUrl(config)}/Users/${config.userId}/Items?${params}`, {
    headers: buildHeaders(config),
  });
  if (!res.ok) throw new Error("Failed to fetch items by genre");
  return res.json();
}

export async function getRandomItem(config: JellyfinConfig, filters?: {
  onlyUnwatched?: boolean;
  maxRuntime?: number;
  genre?: string;
}): Promise<JellyfinItem | null> {
  const params = new URLSearchParams({
    Recursive: "true",
    IncludeItemTypes: "Movie",
    SortBy: "Random",
    SortOrder: "Ascending",
    Limit: "1",
    Fields: "Overview,Genres,CommunityRating,OfficialRating",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Backdrop",
  });

  if (filters?.onlyUnwatched) params.set("IsPlayed", "false");
  if (filters?.genre) params.set("Genres", filters.genre);

  const res = await fetch(`${baseUrl(config)}/Users/${config.userId}/Items?${params}`, {
    headers: buildHeaders(config),
  });
  if (!res.ok) throw new Error("Failed to fetch random item");
  const data = await res.json();
  
  if (data.Items?.length > 0) {
    const item = data.Items[0];
    if (filters?.maxRuntime && item.RunTimeTicks) {
      const runtimeMinutes = item.RunTimeTicks / 600000000;
      if (runtimeMinutes > filters.maxRuntime) {
        return getRandomItem(config, filters);
      }
    }
    return item;
  }
  return null;
}

export async function getSessions(config: JellyfinConfig): Promise<JellyfinSession[]> {
  const res = await fetch(`${baseUrl(config)}/Sessions`, {
    headers: buildHeaders(config),
  });
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function searchItems(config: JellyfinConfig, query: string, limit = 20): Promise<{ Items: JellyfinItem[] }> {
  const params = new URLSearchParams({
    searchTerm: query,
    Recursive: "true",
    IncludeItemTypes: "Movie,Series",
    Fields: "Overview,Genres,CommunityRating,OfficialRating",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Backdrop",
    Limit: limit.toString(),
  });

  const res = await fetch(`${baseUrl(config)}/Users/${config.userId}/Items?${params}`, {
    headers: buildHeaders(config),
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getGenres(config: JellyfinConfig): Promise<{ Items: { Name: string; Id: string }[] }> {
  const params = new URLSearchParams({
    IncludeItemTypes: "Movie,Series",
    Recursive: "true",
  });
  const res = await fetch(`${baseUrl(config)}/Genres?${params}`, {
    headers: buildHeaders(config),
  });
  if (!res.ok) throw new Error("Failed to fetch genres");
  return res.json();
}

export function getImageUrl(config: JellyfinConfig, itemId: string, imageType: "Primary" | "Backdrop" = "Primary", maxWidth = 400): string {
  return `${baseUrl(config)}/Items/${itemId}/Images/${imageType}?maxWidth=${maxWidth}&quality=90`;
}

export function getPlaybackUrl(config: JellyfinConfig, itemId: string): string {
  return `${baseUrl(config)}/web/index.html#!/details?id=${itemId}`;
}

export function ticksToMinutes(ticks?: number): number {
  if (!ticks) return 0;
  return Math.round(ticks / 600000000);
}

export function formatRuntime(ticks?: number): string {
  const minutes = ticksToMinutes(ticks);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
