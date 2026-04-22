import type { FeedItem } from "@/lib/types";
import { Expandable } from "./expandable";
import { FEED_ITEM_BODY_TEXT_CLASSNAME } from "./styles";

type Props = { item: Extract<FeedItem, { type: "highlight" }> };

export function HighlightItem({ item }: Props) {
  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        From highlights
      </div>
      <Expandable collapsedMaxHeight={360}>
        <div
          className={`${FEED_ITEM_BODY_TEXT_CLASSNAME} whitespace-pre-wrap`}
        >
          {item.text}
        </div>
      </Expandable>
      <div className="mt-5 font-serif text-sm text-muted-foreground">
        {item.title}
      </div>
    </article>
  );
}
