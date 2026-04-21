import type { FeedItem } from "@/lib/types";
import { Expandable } from "./expandable";

type Props = { item: Extract<FeedItem, { type: "poem" }> };

export function PoemItem({ item }: Props) {
  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        {item.author} · {item.book}
      </div>
      <Expandable collapsedMaxHeight={420}>
        <div className="font-serif text-base leading-relaxed text-foreground whitespace-pre-wrap md:text-lg">
          {item.body}
        </div>
      </Expandable>
      <div className="mt-5 font-serif text-sm text-muted-foreground">
        {item.title}
      </div>
    </article>
  );
}
