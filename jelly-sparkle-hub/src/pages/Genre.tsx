import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useJellyfin } from "@/contexts/JellyfinContext";
import { getItemsByGenre, type JellyfinItem } from "@/lib/jellyfin";
import MovieCard from "@/components/MovieCard";
import MovieDetailModal from "@/components/MovieDetailModal";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const Genre = () => {
  const { genre } = useParams<{ genre: string }>();
  const { config } = useJellyfin();
  const navigate = useNavigate();
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<JellyfinItem | null>(null);

  useEffect(() => {
    if (!config || !genre) return;
    setLoading(true);
    getItemsByGenre(config, genre, undefined, 60)
      .then((data) => setItems(data.Items.filter((i) => !i.CommunityRating || i.CommunityRating >= 6.0)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config, genre]);

  if (!config || !genre) return null;

  return (
    <>
      <Navbar />
      <main className="pt-16 pb-20 md:pb-8 container">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">{decodeURIComponent(genre)}</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Lade {decodeURIComponent(genre)}-Titel…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              In diesem Genre ist es gerade verdächtig ruhig 🕵️
            </p>
            <p className="text-muted-foreground text-sm mt-2">Vielleicht gibt's hier bald Nachschub!</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3"
          >
            {items.map((item) => (
              <MovieCard key={item.Id} item={item} config={config} size="sm" onClick={() => setSelectedItem(item)} />
            ))}
          </motion.div>
        )}
      </main>
      <MovieDetailModal item={selectedItem} config={config} onClose={() => setSelectedItem(null)} />
    </>
  );
};

export default Genre;
