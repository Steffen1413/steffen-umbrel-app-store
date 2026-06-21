// Extended Jellyfin query helpers for discovery rows
import { type JellyfinConfig, type JellyfinItem, buildHeaders, baseUrl } from "@/lib/jellyfin";

async function fetchItems(
  config: JellyfinConfig,
  params: Record<string, string>
): Promise<JellyfinItem[]> {
  const defaults: Record<string, string> = {
    Recursive: "true",
    Fields: "Overview,Genres,CommunityRating,OfficialRating",
    ImageTypeLimit: "1",
    EnableImageTypes: "Primary,Backdrop",
    IncludeItemTypes: "Movie,Series",
  };
  const merged = { ...defaults, ...params };
  const qs = new URLSearchParams(merged);

  const res = await fetch(
    `${baseUrl(config)}/Users/${config.userId}/Items?${qs}`,
    { headers: buildHeaders(config) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.Items ?? [];
}

/** Highly rated movies (IMDb ≥ 7) */
export function getHighlyRated(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie",
    MinCommunityRating: "7",
    SortBy: "CommunityRating",
    SortOrder: "Descending",
    Limit: limit.toString(),
  });
}

/** Short movies under 2 hours (120 min = 72000000000 ticks) */
export function getShortMovies(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie",
    MaxOfficialRating: "",
    SortBy: "Random",
    SortOrder: "Ascending",
    Limit: "80",
  }).then((items) =>
    items
      .filter((i) => i.RunTimeTicks && i.RunTimeTicks < 72000000000)
      .slice(0, limit)
  );
}

/** Continue watching (in-progress items) */
export function getContinueWatching(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie,Episode",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Filters: "IsResumable",
    Limit: limit.toString(),
  });
}

/** Popular / most played in library */
export function getPopular(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie",
    SortBy: "PlayCount",
    SortOrder: "Descending",
    Limit: limit.toString(),
  });
}

/** Trending = recently played across users */
export function getTrending(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie,Series",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Limit: limit.toString(),
  });
}

/** Hidden gems: rated but rarely watched */
export function getHiddenGems(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie",
    MinCommunityRating: "6.5",
    SortBy: "Random",
    SortOrder: "Ascending",
    IsPlayed: "false",
    Limit: limit.toString(),
  });
}

/** Random picks */
export function getRandomPicks(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie,Series",
    SortBy: "Random",
    SortOrder: "Ascending",
    Limit: limit.toString(),
  });
}

/** Underrated: decent rating but low play count */
export function getUnderrated(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IncludeItemTypes: "Movie",
    MinCommunityRating: "6",
    SortBy: "PlayCount,CommunityRating",
    SortOrder: "Ascending,Descending",
    Limit: limit.toString(),
  });
}

/** Items by genre */
export function getGenreRow(config: JellyfinConfig, genre: string, limit = 20) {
  return fetchItems(config, {
    Genres: genre,
    SortBy: "CommunityRating",
    SortOrder: "Descending",
    Limit: limit.toString(),
  });
}

/** Favorites */
export function getFavorites(config: JellyfinConfig, limit = 20) {
  return fetchItems(config, {
    IsFavorite: "true",
    SortBy: "Random",
    SortOrder: "Ascending",
    Limit: limit.toString(),
  });
}
