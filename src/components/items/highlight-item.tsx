import type { FeedItem } from "@/lib/types";
import { Expandable } from "./expandable";

type Props = { item: Extract<FeedItem, { type: "highlight" }> };

export function HighlightItem({ item }: Props) {
  const displayTitle =
    item.title.length > 60 ? item.title.slice(0, 60) + "…" : item.title;

  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        From highlights
      </div>
      <h2 className="mb-4 font-serif text-xl font-semibold leading-snug text-foreground md:text-2xl">
        {displayTitle}
      </h2>
      <Expandable collapsedMaxHeight={360}>
        <div className="font-serif text-base leading-relaxed text-foreground whitespace-pre-wrap md:text-lg">
          {item.text}
        </div>
      </Expandable>
    </article>
  );
}
