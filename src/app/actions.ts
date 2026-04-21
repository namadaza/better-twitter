"use server";

import type { FeedItem } from "@/lib/types";
import { loadAllSources } from "@/lib/sources";

export async function getFeedItems(): Promise<FeedItem[]> {
  return loadAllSources();
}

export async function getRandomFeedItems(
  count: number = 50,
): Promise<FeedItem[]> {
  const all = await getFeedItems();
  const shuffled = [...all];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
