"use client";

import { BookOpenText } from "lucide-react";

import { FeedOptionsDialog } from "@/components/feed-options-dialog";
import type { FeedItem, FeedOptions } from "@/lib/types";
import type { KoreaderBook } from "@/lib/sources/koreader-generated";

type Props = {
  books: KoreaderBook[];
  highlights: Extract<FeedItem, { type: "highlight" }>[];
  feedOptions: FeedOptions | null;
  onFeedOptionsChange: (options: FeedOptions | null) => void;
};

export function BottomNav({
  books,
  highlights,
  feedOptions,
  onFeedOptionsChange,
}: Props) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex items-center justify-between px-4 py-3">
        <div className="rounded-full border border-border p-2 text-foreground">
          <BookOpenText className="size-4" />
        </div>
        <div className="flex items-center gap-2">
          <FeedOptionsDialog
            books={books}
            highlights={highlights}
            feedOptions={feedOptions}
            onFeedOptionsChange={onFeedOptionsChange}
          />
        </div>
      </div>
    </div>
  );
}
