import { useState, useEffect } from "react";
import {
  getTrendingAll,
  getTrendingMovies,
  getTrendingSeries,
  getNowPlaying,
  getTopRatedMovies,
  getUpcomingMovies,
  getProviderMovies,
  getProviderTV,
  STREAMING_PROVIDERS,
  type TmdbMovie,
} from "@/lib/tmdb";
import TmdbRow from "@/components/TmdbRow";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Loader2, TrendingUp } from "lucide-react";

interface RowData {
  title: string;
  items: TmdbMovie[];
  ranked?: boolean;
}

const TrendsPage = () => {
  const [rows, setRows] = useState<RowData[]>([]);
  const [providerRows, setProviderRows] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<"day" | "week">("week");

  useEffect(() => {
    setLoading(true);

    const mainPromise = Promise.all([
      getTrendingAll(timeWindow),
      getTrendingMovies(timeWindow),
      getTrendingSeries(timeWindow),
      getNowPlaying(),
      getTopRatedMovies(),
      getUpcomingMovies(),
    ]).then(([all, movies, series, nowPlaying, topRated, upcoming]) => {
      setRows([
        { title: "🔥 Trending – Alles", items: all.results, ranked: true },
        { title: "🎬 Trending – Filme", items: movies.results, ranked: true },
        { title: "📺 Trending – Serien", items: series.results, ranked: true },
        { title: "🍿 Jetzt im Kino", items: nowPlaying.results },
        { title: "⭐ Am besten bewertet", items: topRated.results },
        { title: "🔜 Demnächst", items: upcoming.results },
      ].filter((r) => r.items.length > 0));
    });

    const providerPromise = Promise.all(
      STREAMING_PROVIDERS.flatMap((p) => [
        getProviderMovies(p.id).then((res) => ({
          title: `${p.emoji} ${p.name} – Filme`,
          items: res.results,
          ranked: true,
        })),
        getProviderTV(p.id).then((res) => ({
          title: `${p.emoji} ${p.name} – Serien`,
          items: res.results,
          ranked: true,
        })),
      ])
    ).then((results) => {
      setProviderRows(results.filter((r) => r.items.length > 0));
    });

    Promise.all([mainPromise, providerPromise])
      .catch((err) => console.error("TMDB load error:", err))
      .finally(() => setLoading(false));
  }, [timeWindow]);

  return (
    <>
      <Navbar />
      <main className="pt-16 pb-20 md:pb-8 container">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center py-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Globale Trends
            </h1>
          </div>
          <p className="text-muted-foreground text-lg mb-5">
            Was die Welt gerade schaut – powered by TMDB
          </p>
          <div className="inline-flex rounded-lg bg-secondary p-1 gap-1">
            <button
              onClick={() => setTimeWindow("day")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeWindow === "day"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Heute
            </button>
            <button
              onClick={() => setTimeWindow("week")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeWindow === "week"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Diese Woche
            </button>
          </div>
        </motion.section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm animate-pulse">Lade globale Trends…</p>
          </div>
        ) : (
          <>
            {providerRows.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground mb-1">📡 Streaming-Dienste</h2>
                <p className="text-muted-foreground text-sm mb-6">Die beliebtesten Titel pro Plattform</p>
              </div>
            )}

            {providerRows.map((row) => (
              <TmdbRow key={row.title} title={row.title} items={row.items} ranked={row.ranked} />
            ))}

            {rows.map((row) => (
              <TmdbRow key={row.title} title={row.title} items={row.items} ranked={row.ranked} />
            ))}
          </>
        )}
      </main>
    </>
  );
};

export default TrendsPage;
