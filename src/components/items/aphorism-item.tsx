import type { FeedItem } from "@/lib/types";

type Props = { item: Extract<FeedItem, { type: "aphorism" }> };

export function AphorismItem({ item }: Props) {
  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        {item.author} · {item.book}
      </div>
      <div className="font-serif text-lg leading-relaxed text-foreground whitespace-pre-wrap md:text-xl">
        {item.text}
      </div>
    </article>
  );
}
