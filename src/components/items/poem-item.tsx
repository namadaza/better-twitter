import type { FeedItem } from "@/lib/types";
import { Expandable } from "./expandable";

type Props = { item: Extract<FeedItem, { type: "poem" }> };

export function PoemItem({ item }: Props) {
  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        {item.author} · {item.book}
      </div>
      <h2 className="mb-3 font-serif text-xl font-semibold leading-snug text-foreground md:text-2xl">
        {item.title}
      </h2>
      <Expandable collapsedMaxHeight={420}>
        <div className="font-serif text-base leading-relaxed text-foreground whitespace-pre-wrap md:text-lg">
          {item.body}
        </div>
      </Expandable>
    </article>
  );
}
