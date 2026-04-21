import type { FeedItem } from "@/lib/types";
import { Expandable } from "./expandable";

type Props = { item: Extract<FeedItem, { type: "poem" }> };

export function PoemItem({ item }: Props) {
  return (
    <article className="px-4 py-8">
      <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-2 leading-snug">
        {item.title}
      </h2>
      <div className="mb-6 font-serif text-sm italic text-muted-foreground">
        {item.author} · {item.book}
      </div>
      <Expandable collapsedMaxHeight={420}>
        <div className="font-serif text-base md:text-lg text-foreground leading-relaxed whitespace-pre-wrap">
          {item.body}
        </div>
      </Expandable>
    </article>
  );
}
