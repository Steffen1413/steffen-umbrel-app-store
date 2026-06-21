import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { searchItems, type JellyfinItem } from "@/lib/jellyfin";
import MovieCard from "@/components/MovieCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import Navbar from "@/components/Navbar";
import { Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";

const SearchPage = () => {
  const { config } = useJellyfin();
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const [results, setResults] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<JellyfinItem | null>(null);

  useEffect(() => {
    if (!config || !query) return;
    setLoading(true);
    searchItems(config, query, 40)
      .then((data) => setResults(data.Items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config, query]);

  if (!config) return null;

  return (
    <>
      <Navbar />
      <main className="pt-16 pb-20 md:pb-8 container">
        <div className="flex items-center gap-3 mb-6 pt-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">
            Ergebnisse für „{query}"
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Durchsuche die Bibliothek…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Hier ist gerade so wenig los wie in einem Western-Dorf um Mitternacht 🌵
            </p>
            <p className="text-muted-foreground text-sm mt-2">Versuch einen anderen Suchbegriff!</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {results.map((item) => (
              <MovieCard key={item.Id} item={item} config={config} size="sm" onClick={() => setSelectedItem(item)} />
            ))}
          </motion.div>
        )}
      </main>
      <MovieDetailModal item={selectedItem} config={config} onClose={() => setSelectedItem(null)} />
    </>
  );
};

export default SearchPage;
