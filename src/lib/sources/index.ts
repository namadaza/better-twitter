import type { FeedItem } from "@/lib/types";
import { loadHighlights } from "./highlights";
import { loadBooks } from "./books";
import { loadRss } from "./rss";

export async function loadAllSources(): Promise<FeedItem[]> {
  const groups = await Promise.all([
    loadHighlights(),
    loadBooks(),
    loadRss(),
  ]);
  return groups.flat();
}
