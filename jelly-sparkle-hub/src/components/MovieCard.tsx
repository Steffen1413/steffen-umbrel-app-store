import { motion } from "framer-motion";
import { type JellyfinItem, getImageUrl, formatRuntime, type JellyfinConfig } from "@/lib/jellyfin";
import { Star, Play, Clock } from "lucide-react";

interface MovieCardProps {
  item: JellyfinItem;
  config: JellyfinConfig;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const MovieCard = ({ item, config, size = "md", onClick }: MovieCardProps) => {
  const widths = { sm: "w-32", md: "w-40", lg: "w-52" };
  const imgWidths = { sm: 200, md: 300, lg: 400 };

  const hasImage = item.ImageTags?.Primary;

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`${widths[size]} shrink-0 cursor-pointer group`}
      onClick={onClick}
    >
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2 relative shadow-card">
        {hasImage ? (
          <img
            src={getImageUrl(config, item.Id, "Primary", imgWidths[size])}
            alt={item.Name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm p-2 text-center">
            {item.Name}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Play className="h-3.5 w-3.5 text-primary-foreground ml-0.5" />
            </div>
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-foreground truncate">{item.Name}</h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
        {item.ProductionYear && <span>{item.ProductionYear}</span>}
        {item.CommunityRating && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            {item.CommunityRating.toFixed(1)}
          </span>
        )}
        {item.RunTimeTicks && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {formatRuntime(item.RunTimeTicks)}
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default MovieCard;
