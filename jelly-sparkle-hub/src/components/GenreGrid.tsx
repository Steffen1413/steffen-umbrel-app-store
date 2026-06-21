import { motion } from "framer-motion";

// Netflix red: #E50914
const TILE_BG = "rgba(38, 38, 38, 0.85)";
const NETFLIX_GLOW = "rgba(229, 9, 20, 0.40)";

interface GenreGridProps {
  genres: string[];
  onSelect: (genre: string) => void;
}

const GenreGrid = ({ genres, onSelect }: GenreGridProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {genres.map((genre, i) => (
        <motion.button
          key={genre}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(genre)}
          className="group relative overflow-hidden rounded-2xl p-6 text-left transition-shadow duration-300"
          style={{
            background: TILE_BG,
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 4px 24px -4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Top highlight reflection */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
            }}
          />

          {/* Hover glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
            style={{
              boxShadow: `0 0 32px 4px ${NETFLIX_GLOW}, inset 0 1px 0 rgba(255,255,255,0.12)`,
            }}
          />

          <span className="relative z-10 text-sm font-bold text-white drop-shadow-md">
            {genre}
          </span>
        </motion.button>
      ))}
    </div>
  );
};

export default GenreGrid;
