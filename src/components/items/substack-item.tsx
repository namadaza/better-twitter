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
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        On Substack
      </div>
      <h2 className="mb-3 font-serif text-xl font-semibold leading-snug text-foreground md:text-2xl">
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
        <p className="mb-5 font-serif text-base leading-relaxed text-foreground md:text-lg">
          {item.excerpt}
        </p>
      )}
      {(item.author || rel) && (
        <div className="font-serif text-sm text-muted-foreground">
          {item.publication}
          {item.author ? ` · ${item.author}` : ""}
          {rel ? " · " : null}
          {rel ? rel : null}
        </div>
      )}
      {!item.author && !rel && (
        <div className="font-serif text-sm text-muted-foreground">
          {item.publication}
        </div>
      )}
    </article>
  );
}
