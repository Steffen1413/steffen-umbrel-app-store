import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type TmdbMovie } from "@/lib/tmdb";
import TmdbCard from "./TmdbCard";

interface Props {
  title: string;
  items: TmdbMovie[];
  ranked?: boolean;
}

const TmdbRow = ({ title, items, ranked }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-foreground mb-3">{title}</h2>
      <div className="relative group/row">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-0 bottom-8 z-10 w-8 flex items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {items.map((item, i) => (
            <TmdbCard key={item.id} item={item} rank={ranked ? i + 1 : undefined} />
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-0 bottom-8 z-10 w-8 flex items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>
    </section>
  );
};

export default TmdbRow;
