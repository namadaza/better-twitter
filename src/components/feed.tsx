"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedItem, FeedOptions } from "@/lib/types";
import { getFeedItemsPage } from "@/app/actions";
import { HighlightItem } from "./items/highlight-item";
import { BookItem } from "./items/book-item";
import { RssItem } from "./items/rss-item";
import { ArtworkItem } from "./items/artwork-item";
import type { Artwork } from "./items/artwork-item";

interface FeedProps {
  initialItems: FeedItem[];
  seed: string;
  options?: FeedOptions | null;
}

const PAGE_SIZE = 30;

function renderItem(item: FeedItem) {
  switch (item.type) {
    case "highlight":
      return <HighlightItem item={item} />;
    case "book":
      return <BookItem item={item} />;
    case "rss":
      return <RssItem item={item} />;
  }
}

export function Feed({ initialItems, seed, options }: FeedProps) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length === PAGE_SIZE);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artworksLoading, setArtworksLoading] = useState(true);
  const [visibleArtworkCount, setVisibleArtworkCount] = useState(PAGE_SIZE);

  // Load the generated WikiArt artworks manifest at runtime.
  useEffect(() => {
    let mounted = true;
    (async () => {
        try {
          // dynamic import so this doesn't error at build time if file is missing
          // cast the import to a shape that contains Artwork items
          const mod = (await import("@/lib/data/wikiart_artworks.json")) as {
            items?: Artwork[];
            default?: { items?: Artwork[] };
          };
          const items = mod.items ?? mod.default?.items ?? [];
          if (!mounted) return;
          // shuffle a copy so presentation varies
        const copy = items.slice();
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        setArtworks(copy);
      } catch (e) {
        // ignore if missing or can't be read
        console.warn("Could not load wikiart_artworks.json", e);
      } finally {
        if (mounted) setArtworksLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!options) {
      setItems(initialItems);
      setHasMore(initialItems.length === PAGE_SIZE);
      return;
    }

    if (options.contentType === "art") {
      setItems([]);
      setVisibleArtworkCount(PAGE_SIZE);
      setHasMore(artworks.length > PAGE_SIZE);
      return;
    }

    setLoading(true);
    getFeedItemsPage(0, PAGE_SIZE, seed, options)
      .then((nextItems) => {
        if (cancelled) return;
        setItems(nextItems);
        setHasMore(nextItems.length === PAGE_SIZE);
      })
      .catch((error) => {
        if (!cancelled) console.error("Error applying feed options:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artworks.length, initialItems, options, seed]);

  useEffect(() => {
    if (options?.contentType === "art") {
      setHasMore(artworks.length > visibleArtworkCount);
    }
  }, [artworks.length, options?.contentType, visibleArtworkCount]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    if (options?.contentType === "art") {
      setVisibleArtworkCount((count) => {
        const nextCount = Math.min(count + PAGE_SIZE, artworks.length);
        setHasMore(nextCount < artworks.length);
        return nextCount;
      });
      return;
    }

    setLoading(true);
    try {
      const more = await getFeedItemsPage(items.length, PAGE_SIZE, seed, options);
      setItems((prev) => [...prev, ...more]);
      if (more.length < PAGE_SIZE) setHasMore(false);
    } catch (error) {
      console.error("Error loading more items:", error);
    } finally {
      setLoading(false);
    }
  }, [artworks.length, hasMore, items.length, loading, options, seed]);

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
      {options?.contentType === "art" && artworks.length > 0 && (
        <div>
          {artworks.slice(0, visibleArtworkCount).map((art, index) => (
            <div key={art.id}>
              <ArtworkItem art={art} />
              {index < Math.min(visibleArtworkCount, artworks.length) - 1 && (
                <div className="mx-4 border-t border-border/50" />
              )}
            </div>
          ))}
        </div>
      )}
      {options?.contentType === "art" && artworksLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      )}
      {options?.contentType === "art" &&
        !artworksLoading &&
        artworks.length === 0 && (
        <div className="px-4 py-16 text-center font-serif text-muted-foreground">
          No artwork found.
        </div>
      )}
      {options?.contentType !== "art" && items.length === 0 && !loading && (
        <div className="px-4 py-16 text-center font-serif text-muted-foreground">
          No items yet. Add highlights, extract books, or follow an RSS feed.
        </div>
      )}
      {options?.contentType !== "art" && items.map((item, index) => (
        <div key={item.id}>
          {renderItem(item)}
          {index < items.length - 1 && (
            <div className="mx-4 border-t border-border/50" />
          )}
          {/* Insert an artwork post after every 4 feed items */}
          {!options && artworks.length > 0 && index % 4 === 0 && (
            <div className="mt-4">
              <ArtworkItem art={artworks[Math.floor(index / 4) % artworks.length]} />
              <div className="mx-4 border-t border-border/50" />
            </div>
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
