import type { FeedItem } from "@/lib/types";
import { ExternalLink } from "lucide-react";
import { FEED_ITEM_BODY_TEXT_CLASSNAME } from "./styles";

type Props = { item: Extract<FeedItem, { type: "aphorism" }> };

export function AphorismItem({ item }: Props) {
  const meta = [item.source, item.reference].filter(Boolean).join(" · ");
  const fallbackMeta = [item.author, item.book].filter(Boolean).join(" · ");
  const header = meta || fallbackMeta;

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
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        {headerNode}
      </div>
      <div
        className={`${FEED_ITEM_BODY_TEXT_CLASSNAME} whitespace-pre-wrap`}
      >
        {item.text}
      </div>
      {item.secondaryText && (
        <div
          className="mt-5 text-right font-serif text-2xl leading-loose text-foreground/85 whitespace-pre-wrap md:text-3xl"
          dir="rtl"
          lang="ar"
        >
          {item.secondaryText}
        </div>
      )}
    </article>
  );
}
