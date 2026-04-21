import type { FeedItem } from "@/lib/types";
import { loadHighlights } from "./highlights";
import { loadBooks } from "./books";
import { loadSubstack } from "./substack";

export async function loadAllSources(): Promise<FeedItem[]> {
  const groups = await Promise.all([
    loadHighlights(),
    loadBooks(),
    loadSubstack(),
  ]);
  return groups.flat();
}
