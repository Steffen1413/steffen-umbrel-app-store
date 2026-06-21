import { useState } from "react";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { getRandomItem, type JellyfinItem } from "@/lib/jellyfin";
import MovieDetailModal from "@/components/MovieDetailModal";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Dice5, Loader2, Filter } from "lucide-react";

const ROLLING_QUOTES = [
  "Würfel rollen…",
  "Das Schicksal entscheidet…",
  "Filmgötter werden befragt…",
  "Greife blindlings ins Regal…",
];

const RandomMovie = () => {
  const { config } = useJellyfin();
  const [item, setItem] = useState<JellyfinItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [onlyUnwatched, setOnlyUnwatched] = useState(false);
  const [maxRuntime, setMaxRuntime] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [rollingQuote] = useState(() => ROLLING_QUOTES[Math.floor(Math.random() * ROLLING_QUOTES.length)]);

  const roll = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const result = await getRandomItem(config, { onlyUnwatched, maxRuntime });
      setItem(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!config) return null;

  return (
    <>
      <Navbar />
      <main className="pt-16 pb-20 md:pb-8 container">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h1 className="text-3xl font-bold text-foreground">Überrasch mich! 🎲</h1>
            <p className="text-muted-foreground max-w-md">
              Kannst dich nicht entscheiden? Lass das Schicksal wählen – ich übernehme keine Verantwortung für deine Schlafenszeit.
            </p>

            <div className="flex flex-col items-center gap-4">
              <motion.button
                onClick={roll}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-3 shadow-elevated"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Dice5 className="h-6 w-6" />}
                {loading ? rollingQuote : "Würfeln!"}
              </motion.button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>

              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="glass rounded-xl p-4 space-y-3 w-full max-w-xs"
                >
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlyUnwatched}
                      onChange={(e) => setOnlyUnwatched(e.target.checked)}
                      className="rounded border-border accent-primary"
                    />
                    Nur ungesehene Filme
                  </label>
                  <div>
                    <label className="text-sm text-foreground block mb-1">Maximale Laufzeit</label>
                    <select
                      value={maxRuntime || ""}
                      onChange={(e) => setMaxRuntime(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm"
                    >
                      <option value="">Egal, ich hab Zeit</option>
                      <option value="90">Unter 1,5 Stunden</option>
                      <option value="120">Unter 2 Stunden</option>
                      <option value="150">Unter 2,5 Stunden</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </div>

            {!item && !loading && (
              <p className="text-xs text-muted-foreground italic mt-8">
                Tipp: Manchmal ist der beste Film der, den man nicht erwartet hat 🎬
              </p>
            )}
          </motion.div>
        </div>
      </main>
      <MovieDetailModal item={item} config={config} onClose={() => setItem(null)} />
    </>
  );
};

export default RandomMovie;
