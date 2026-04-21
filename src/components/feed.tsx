"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedItem } from "@/lib/types";
import { getRandomFeedItems } from "@/app/actions";
import { HighlightItem } from "./items/highlight-item";
import { PoemItem } from "./items/poem-item";
import { AphorismItem } from "./items/aphorism-item";
import { SubstackItem } from "./items/substack-item";

interface FeedProps {
  initialItems: FeedItem[];
}

function renderItem(item: FeedItem) {
  switch (item.type) {
    case "highlight":
      return <HighlightItem item={item} />;
    case "poem":
      return <PoemItem item={item} />;
    case "aphorism":
      return <AphorismItem item={item} />;
    case "substack":
      return <SubstackItem item={item} />;
  }
}

export function Feed({ initialItems }: FeedProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const more = await getRandomFeedItems(30);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        const fresh = more.filter((i) => !seen.has(i.id));
        return [...prev, ...fresh];
      });
    } catch (error) {
      console.error("Error loading more items:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24">
      {items.length === 0 && !loading && (
        <div className="px-4 py-16 text-center font-serif text-muted-foreground">
          No items yet. Add highlights, extract books, or follow a Substack.
        </div>
      )}
      {items.map((item, index) => (
        <div key={item.id}>
          {renderItem(item)}
          {index < items.length - 1 && (
            <div className="mx-4 border-t border-border/50" />
          )}
        </div>
      ))}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      )}
    </div>
  );
}
