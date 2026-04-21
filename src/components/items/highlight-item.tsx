import type { FeedItem } from "@/lib/types";
import { Expandable } from "./expandable";

type Props = { item: Extract<FeedItem, { type: "highlight" }> };

export function HighlightItem({ item }: Props) {
  const displayTitle =
    item.title.length > 60 ? item.title.slice(0, 60) + "…" : item.title;

  return (
    <article className="px-4 py-8">
      <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-6 leading-snug">
        {displayTitle}
      </h2>
      <Expandable collapsedMaxHeight={360}>
        <div className="font-serif text-base md:text-lg text-foreground leading-relaxed whitespace-pre-wrap">
          {item.text}
        </div>
      </Expandable>
      <div className="mt-6 font-serif text-sm text-muted-foreground italic">
        — {item.title}
      </div>
    </article>
  );
}
