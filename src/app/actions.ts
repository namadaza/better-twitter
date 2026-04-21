"use server";

import type { FeedItem } from "@/lib/types";
import { loadAllSources } from "@/lib/sources";

export async function getFeedItems(): Promise<FeedItem[]> {
  const all = await loadAllSources();
  const external = all
    .filter((item): item is Extract<FeedItem, { type: "substack" }> => {
      return item.type === "substack";
    })
    .sort((a, b) => {
      const ad = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bd = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bd - ad;
    });

  const local = all
    .filter((item) => item.type !== "substack")
    .sort((a, b) => a.id.localeCompare(b.id));

  if (external.length === 0) return local;
  if (local.length === 0) return external;

  const mixed: FeedItem[] = [];
  const localPerExternal = local.length / external.length;
  let localCursor = 0;
  let localDebt = 0;

  for (const item of external) {
    mixed.push(item);
    localDebt += localPerExternal;
    while (localCursor < local.length && localDebt >= 1) {
      mixed.push(local[localCursor++]);
      localDebt -= 1;
    }
  }

  while (localCursor < local.length) {
    mixed.push(local[localCursor++]);
  }

  return mixed;
}

export async function getFeedItemsPage(
  offset: number = 0,
  count: number = 50,
): Promise<FeedItem[]> {
  const all = await getFeedItems();
  return all.slice(offset, offset + count);
}
