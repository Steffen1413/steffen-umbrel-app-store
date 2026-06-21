const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1N2RjMmI5NWVkZTAxNjdjZWM3MjI3OTExMmM1MTdhYSIsIm5iZiI6MTc3Mjk3NDE5MC43ODMsInN1YiI6IjY5YWQ3MDZlMzk2MzEzZDExZGMxZGY2MiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.tb0zdb1fKcW5iSP4gTp_TYjbYHhGGWoIKs0xVm_6nKs";
const BASE = "https://api.themoviedb.org/3";
export const IMG_BASE = "https://image.tmdb.org/t/p";

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ language: "de-DE", ...params });
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface TmdbPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/** Trending movies this week */
export function getTrendingMovies(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TmdbPage<TmdbMovie>>(`/trending/movie/${timeWindow}`);
}

/** Trending series this week */
export function getTrendingSeries(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TmdbPage<TmdbMovie>>(`/trending/tv/${timeWindow}`);
}

/** Trending all (movies + tv) */
export function getTrendingAll(timeWindow: "day" | "week" = "week") {
  return tmdbFetch<TmdbPage<TmdbMovie>>(`/trending/all/${timeWindow}`);
}

/** Now playing in cinemas */
export function getNowPlaying() {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/movie/now_playing", { region: "DE" });
}

/** Popular movies */
export function getPopularMovies() {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/movie/popular");
}

/** Popular TV */
export function getPopularTV() {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/tv/popular");
}

/** Top rated movies */
export function getTopRatedMovies() {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/movie/top_rated");
}

/** Upcoming movies */
export function getUpcomingMovies() {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/movie/upcoming", { region: "DE" });
}

/** Streaming provider IDs for TMDB watch/providers */
export const STREAMING_PROVIDERS = [
  { id: 8, name: "Netflix", emoji: "🔴" },
  { id: 9, name: "Amazon Prime Video", emoji: "🔵" },
  { id: 337, name: "Disney+", emoji: "🏰" },
  { id: 1899, name: "Max", emoji: "🟣" },
  { id: 531, name: "Paramount+", emoji: "⛰️" },
  { id: 350, name: "Apple TV+", emoji: "🍎" },
] as const;

/** Popular movies on a specific streaming provider */
export function getProviderMovies(providerId: number) {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/discover/movie", {
    sort_by: "popularity.desc",
    with_watch_providers: providerId.toString(),
    watch_region: "DE",
  });
}

/** Popular TV on a specific streaming provider */
export function getProviderTV(providerId: number) {
  return tmdbFetch<TmdbPage<TmdbMovie>>("/discover/tv", {
    sort_by: "popularity.desc",
    with_watch_providers: providerId.toString(),
    watch_region: "DE",
  });
}

export function posterUrl(path: string | null, size = "w342") {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size = "w780") {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}
