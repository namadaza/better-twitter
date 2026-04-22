import type { FeedItem } from "@/lib/types";
import { ExternalLink } from "lucide-react";

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
  const publicationLabel = `Substack · ${item.publication}`;
  const meta = [item.author, rel].filter(Boolean).join(" · ");

  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:opacity-70"
        >
          {publicationLabel}
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
        </a>
      </div>
      <div className="mb-3 font-serif text-base leading-relaxed text-foreground md:text-lg">
        {item.title}
      </div>
      {item.excerpt && (
        <p className="mb-5 font-serif text-base leading-relaxed text-foreground md:text-lg">
          {item.excerpt}
        </p>
      )}
      {meta && (
        <div className="font-serif text-sm text-muted-foreground">{meta}</div>
      )}
    </article>
  );
}
