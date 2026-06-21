import { type TmdbMovie, posterUrl } from "@/lib/tmdb";
import { Star } from "lucide-react";

interface Props {
  item: TmdbMovie;
  rank?: number;
}

const TmdbCard = ({ item, rank }: Props) => {
  const title = item.title || item.name || "Unbekannt";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const poster = posterUrl(item.poster_path);

  return (
    <div className="group relative flex-shrink-0 w-[140px] sm:w-[160px] cursor-pointer">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
        {rank != null && (
          <div className="absolute top-1 left-1 z-10 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-md">
            {rank}
          </div>
        )}
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Kein Bild
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-xs font-medium text-foreground truncate">{title}</p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {year && <span>{year}</span>}
          {item.vote_average > 0 && (
            <>
              <span>•</span>
              <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
              <span>{item.vote_average.toFixed(1)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TmdbCard;
