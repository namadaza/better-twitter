"use client";

import { useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { Feed } from "@/components/feed";
import type { KoreaderBook } from "@/lib/sources/koreader-generated";
import type { FeedItem, FeedOptions } from "@/lib/types";

type Props = {
  initialItems: FeedItem[];
  seed: string;
  books: KoreaderBook[];
  highlights: Extract<FeedItem, { type: "highlight" }>[];
};

export function HomeFeed({ initialItems, seed, books, highlights }: Props) {
  const [feedOptions, setFeedOptions] = useState<FeedOptions | null>(null);

  return (
    <>
      <Feed initialItems={initialItems} seed={seed} options={feedOptions} />
      <BottomNav
        books={books}
        highlights={highlights}
        feedOptions={feedOptions}
        onFeedOptionsChange={setFeedOptions}
      />
    </>
  );
}
