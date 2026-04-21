import type { FeedItem } from "@/lib/types";

type Props = { item: Extract<FeedItem, { type: "substack" }> };

function relativeDate(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))}m ago`;
  if (diff < day) return `${Math.round(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.round(diff / (7 * day))}w ago`;
  if (diff < 365 * day) return `${Math.round(diff / (30 * day))}mo ago`;
  return `${Math.round(diff / (365 * day))}y ago`;
}

export function SubstackItem({ item }: Props) {
  const rel = relativeDate(item.publishedAt);
  return (
    <article className="px-4 py-8">
      <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-3 leading-snug">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline underline-offset-4"
        >
          {item.title}
        </a>
      </h2>
      {item.excerpt && (
        <p className="font-serif text-base md:text-lg text-foreground leading-relaxed mb-6">
          {item.excerpt}
        </p>
      )}
      <div className="font-serif text-sm text-muted-foreground italic">
        {item.publication}
        {item.author ? ` · ${item.author}` : ""}
        {rel ? ` · ${rel}` : ""}
      </div>
    </article>
  );
}
