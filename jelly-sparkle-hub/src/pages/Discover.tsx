import { useState } from "react";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { getItemsByGenre, type JellyfinItem } from "@/lib/jellyfin";
import MovieCard from "@/components/MovieCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { Compass, Loader2, Sparkles } from "lucide-react";

const MOODS = [
  { key: "Funny", label: "😂 Lustig" },
  { key: "Exciting", label: "🔥 Aufregend" },
  { key: "Relaxed", label: "😌 Entspannt" },
  { key: "Epic", label: "⚡ Episch" },
  { key: "Emotional", label: "😢 Emotional" },
  { key: "Scary", label: "😱 Gruselig" },
  { key: "Romantic", label: "💕 Romantisch" },
];

const MOOD_TO_GENRES: Record<string, string[]> = {
  Funny: ["Comedy"],
  Exciting: ["Action", "Thriller"],
  Relaxed: ["Drama", "Romance", "Family"],
  Epic: ["Adventure", "Sci-Fi", "Science Fiction", "Fantasy"],
  Emotional: ["Drama", "Romance"],
  Scary: ["Horror", "Thriller", "Mystery"],
  Romantic: ["Romance", "Comedy"],
};

const GENRES = [
  "Action", "Comedy", "Drama", "Sci-Fi", "Thriller", "Fantasy",
  "Animation", "Adventure", "Crime", "Mystery", "Horror", "Romance", "Documentary",
];

const Discover = () => {
  const { config } = useJellyfin();
  const [mood, setMood] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [results, setResults] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JellyfinItem | null>(null);
  const [step, setStep] = useState(1);

  const search = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const searchGenres = genre
        ? [genre]
        : mood
        ? MOOD_TO_GENRES[mood] || []
        : [];

      const allItems: JellyfinItem[] = [];
      for (const g of searchGenres.length > 0 ? searchGenres : ["Action"]) {
        const data = await getItemsByGenre(config, g, "Movie", 20);
        allItems.push(...data.Items);
      }

      const seen = new Set<string>();
      const unique = allItems.filter((item) => {
        if (seen.has(item.Id)) return false;
        seen.add(item.Id);
        if (item.CommunityRating && item.CommunityRating < 6.0) return false;
        return true;
      });

      unique.sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0));
      setResults(unique.slice(0, 20));
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="text-center mb-8 pt-4">
            <Compass className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="text-3xl font-bold text-foreground mb-2">Was soll ich schauen?</h1>
            <p className="text-muted-foreground">
              Keine Ahnung, was du schauen sollst? Ich auch nicht – aber ich hab ein paar verdammt gute Vorschläge für dich.
            </p>
          </div>

          {/* Step 1: Mood */}
          {step >= 1 && (
            <section className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Wie fühlst du dich gerade?</h3>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMood(m.key); setStep(2); }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      mood === m.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Step 2: Genre */}
          {step >= 2 && (
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Genre wählen (optional)</h3>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(genre === g ? null : g)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      genre === g
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {step >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-6 mb-8">
              <button
                onClick={search}
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {loading ? "Durchsuche die Bibliothek…" : "Filme finden"}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Results */}
        {results.length > 0 && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              🎬 {results.length} Titel gefunden – viel Spaß beim Stöbern!
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {results.map((item) => (
                <MovieCard key={item.Id} item={item} config={config} size="sm" onClick={() => setSelectedItem(item)} />
              ))}
            </div>
          </motion.section>
        )}

        {results.length === 0 && step >= 2 && !loading && mood && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Hier ist gerade so wenig los wie in einem Western-Dorf um Mitternacht 🌵</p>
            <p className="text-sm mt-2">Versuch eine andere Stimmung oder ein anderes Genre!</p>
          </div>
        )}
      </main>
      <MovieDetailModal item={selectedItem} config={config} onClose={() => setSelectedItem(null)} />
    </>
  );
};

export default Discover;
