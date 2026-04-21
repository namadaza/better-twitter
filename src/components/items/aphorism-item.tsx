import type { FeedItem } from "@/lib/types";

type Props = { item: Extract<FeedItem, { type: "aphorism" }> };

export function AphorismItem({ item }: Props) {
  return (
    <article className="px-4 py-8">
      <div className="font-serif text-lg md:text-xl text-foreground leading-relaxed whitespace-pre-wrap">
        {item.text}
      </div>
      <div className="mt-6 font-serif text-sm text-muted-foreground italic">
        — {item.author}, <span className="not-italic">{item.book}</span>
      </div>
    </article>
  );
}
