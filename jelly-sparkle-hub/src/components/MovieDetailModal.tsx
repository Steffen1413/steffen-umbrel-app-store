import { motion, AnimatePresence } from "framer-motion";
import { type JellyfinItem, type JellyfinConfig, getImageUrl, formatRuntime, getPlaybackUrl } from "@/lib/jellyfin";
import { X, Star, Play, Clock, Calendar, Tag, Youtube } from "lucide-react";

interface MovieDetailModalProps {
  item: JellyfinItem | null;
  config: JellyfinConfig;
  onClose: () => void;
}

const MovieDetailModal = ({ item, config, onClose }: MovieDetailModalProps) => {
  if (!item) return null;

  const backdropId = item.BackdropImageTags?.length ? item.Id : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          {backdropId && (
            <div className="relative h-48 sm:h-64 overflow-hidden rounded-t-2xl">
              <img
                src={getImageUrl(config, backdropId, "Backdrop", 800)}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-background/60 backdrop-blur-sm text-foreground hover:bg-background/80 transition-colors z-20"
          >
            <X className="h-4 w-4" />
          </button>

          <div className={`p-6 ${backdropId ? "-mt-16 relative z-10" : ""}`}>
            <div className="flex gap-4">
              {item.ImageTags?.Primary && (
                <img
                  src={getImageUrl(config, item.Id, "Primary", 200)}
                  alt={item.Name}
                  className="w-24 sm:w-32 rounded-lg shadow-card shrink-0 aspect-[2/3] object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground">{item.Name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {item.ProductionYear && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {item.ProductionYear}
                    </span>
                  )}
                  {item.CommunityRating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      {item.CommunityRating.toFixed(1)}
                    </span>
                  )}
                  {item.RunTimeTicks && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRuntime(item.RunTimeTicks)}
                    </span>
                  )}
                  {item.OfficialRating && (
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-xs font-medium">
                      {item.OfficialRating}
                    </span>
                  )}
                </div>
                {item.Genres?.length && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.Genres.map((g) => (
                      <span key={g} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                        <Tag className="h-3 w-3" />
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {item.Overview && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{item.Overview}</p>
            )}

            <div className="flex gap-3 mt-6">
              <a
                href={getPlaybackUrl(config, item.Id)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                <Play className="h-4 w-4" />
                Jetzt abspielen
              </a>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.Name}${item.ProductionYear ? ` ${item.ProductionYear}` : ""} trailer`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                <Youtube className="h-4 w-4" />
                Trailer
              </a>
            </div>

            <p className="text-xs text-muted-foreground mt-4 italic">
              Achtung: Könnte zu spontanen Filmabenden führen 🎬
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MovieDetailModal;
