import type { FeedItem } from "@/lib/types";
import { ExternalLink } from "lucide-react";
import { Expandable } from "./expandable";
import { FEED_ITEM_BODY_TEXT_CLASSNAME } from "./styles";

type Props = { item: Extract<FeedItem, { type: "book" }> };

function poemHeader(item: Extract<FeedItem, { type: "book" }>): string {
  return [item.author, item.book].filter(Boolean).join(" · ");
}

function proseHeader(item: Extract<FeedItem, { type: "book" }>): string {
  const meta = [item.source, item.reference].filter(Boolean).join(" · ");
  if (meta) return meta;
  return [item.author, item.book].filter(Boolean).join(" · ");
}

export function BookItem({ item }: Props) {
  const header = item.format === "poem" ? poemHeader(item) : proseHeader(item);
  const collapsedMaxHeight = item.format === "poem" ? 420 : 360;

  const headerNode = item.url ? (
    <a
      className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
      href={item.url}
      rel="noreferrer"
      target="_blank"
    >
      {header}
      <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
    </a>
  ) : (
    header
  );

  return (
    <article className="px-4 py-8">
      {header && (
        <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
          {headerNode}
        </div>
      )}
      <Expandable collapsedMaxHeight={collapsedMaxHeight}>
        <div
          className={`${FEED_ITEM_BODY_TEXT_CLASSNAME} whitespace-pre-wrap`}
        >
          {item.body}
        </div>
      </Expandable>
      {item.secondaryText && (
        <div
          className="mt-5 text-right font-serif text-2xl leading-loose text-foreground/85 whitespace-pre-wrap md:text-3xl"
          dir="rtl"
          lang="ar"
        >
          {item.secondaryText}
        </div>
      )}
      {item.format === "poem" && item.title && (
        <div className="mt-5 font-serif text-sm text-muted-foreground">
          {item.title}
        </div>
      )}
    </article>
  );
}
