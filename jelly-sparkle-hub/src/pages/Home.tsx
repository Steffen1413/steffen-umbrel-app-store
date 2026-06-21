import { useState, useEffect } from "react";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { useNavigate } from "react-router-dom";
import { getRecentlyAdded, getGenres, type JellyfinItem } from "@/lib/jellyfin";
import {
  getHighlyRated,
  getShortMovies,
  getPopular,
  getTrending,
  getHiddenGems,
  getRandomPicks,
  getUnderrated,
  getGenreRow,
  getFavorites,
} from "@/lib/jellyfin-queries";
import MovieRow from "@/components/MovieRow";
import GenreGrid from "@/components/GenreGrid";

import MovieDetailModal from "@/components/MovieDetailModal";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface RowData {
  title: string;
  items: JellyfinItem[];
}

const GENRE_ROWS = [
  "Science Fiction",
  "Thriller",
  "Drama",
  "Action",
  "Comedy",
  "Adventure",
  "Mystery",
  "Crime",
  "Animation",
  "Fantasy",
  "Horror",
  "Romance",
];

const GENRE_LABELS: Record<string, string> = {
  "Science Fiction": "🚀 Science Fiction",
  Thriller: "😰 Thriller",
  Drama: "🎭 Drama",
  Action: "💥 Action",
  Comedy: "😂 Komödie",
  Adventure: "🗺️ Abenteuer",
  Mystery: "🔍 Mystery",
  Crime: "🔫 Krimi",
  Animation: "🎨 Animation",
  Fantasy: "🧙 Fantasy",
  Horror: "👻 Horror",
  Romance: "💕 Romantik",
};

const LOADING_MESSAGES = [
  "Durchstöbere deine Bibliothek…",
  "Suche die besten Filme für dich…",
  "Popcorn wird zubereitet…",
  "Filmrollen werden sortiert…",
  "Schaue, was sich so alles versteckt…",
];

const Home = () => {
  const { config } = useJellyfin();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RowData[]>([]);
  const [genreRows, setGenreRows] = useState<RowData[]>([]);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<JellyfinItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg] = useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);

  useEffect(() => {
    if (!config) return;

    const load = async () => {
      try {
        const [
          recentMovies,
          recentSeries,
          popular,
          trending,
          highlyRated,
          hiddenGems,
          randomPicks,
          shortMovies,
          underrated,
          favorites,
          genreData,
        ] = await Promise.all([
          getRecentlyAdded(config, "Movie", 20),
          getRecentlyAdded(config, "Series", 20),
          getPopular(config),
          getTrending(config),
          getHighlyRated(config),
          getHiddenGems(config),
          getRandomPicks(config),
          getShortMovies(config),
          getUnderrated(config),
          getFavorites(config),
          getGenres(config),
        ]);

        const mainRows: RowData[] = [
          { title: "🆕 Frisch eingetroffen – Filme", items: recentMovies },
          { title: "📺 Frisch eingetroffen – Serien", items: recentSeries },
          { title: "🔥 Beliebt in deiner Bibliothek", items: popular },
          { title: "📈 Gerade angesagt", items: trending },
          { title: "⭐ Hochgelobt (IMDb ≥ 7)", items: highlyRated },
          { title: "💎 Versteckte Schätze – warten aufs Entdecken", items: hiddenGems },
          { title: "🎲 Zufällige Empfehlungen", items: randomPicks },
          { title: "⏱ Kurzfilme unter 2 Stunden – perfekt für zwischendurch", items: shortMovies },
          { title: "🎯 Unterschätzte Perlen", items: underrated },
          { title: "❤️ Deine Favoriten", items: favorites },
        ].filter((r) => r.items.length > 0);

        setRows(mainRows);
        setAllGenres(genreData.Items.map((g) => g.Name).slice(0, 15));

        const genreResults = await Promise.all(
          GENRE_ROWS.map((genre) =>
            getGenreRow(config, genre).then((items) => ({
              title: GENRE_LABELS[genre] || `🎬 ${genre}`,
              items,
            }))
          )
        );
        setGenreRows(genreResults.filter((r) => r.items.length > 0));
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [config]);

  if (!config) return null;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center pt-14 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm animate-pulse">{loadingMsg}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-16 pb-20 md:pb-8 container">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center py-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Was willst du heute schauen?
          </h1>
          <p className="text-muted-foreground text-lg">
            Keine Ahnung? Kein Problem – stöbere einfach drauflos 🍿
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={() => navigate("/discover")}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              🎬 Was soll ich schauen?
            </button>
            <button
              onClick={() => navigate("/random")}
              className="px-6 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-accent transition-colors"
            >
              🎲 Überrasch mich!
            </button>
          </div>
        </motion.section>


        {/* Genre navigation grid – prominent position */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Nach Genre stöbern</h2>
          <GenreGrid genres={allGenres} onSelect={(g) => navigate(`/genre/${encodeURIComponent(g)}`)} />
        </section>

        {/* Discovery rows */}
        {rows.map((row) => (
          <MovieRow
            key={row.title}
            title={row.title}
            items={row.items}
            config={config}
            onItemClick={setSelectedItem}
          />
        ))}

        {/* Genre-based rows */}
        {genreRows.map((row) => (
          <MovieRow
            key={row.title}
            title={row.title}
            items={row.items}
            config={config}
            onItemClick={setSelectedItem}
          />
        ))}
      </main>

      <MovieDetailModal item={selectedItem} config={config} onClose={() => setSelectedItem(null)} />
    </>
  );
};

export default Home;
