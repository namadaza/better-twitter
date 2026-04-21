import { readFile, stat } from "fs/promises";
import { join } from "path";
import type { FeedItem } from "@/lib/types";

const EXTERNAL_FEED_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "external-feed.json",
);

type ExternalFeedFile = {
  fetchedAt: string | null;
  items: Array<Extract<FeedItem, { type: "substack" }>>;
};

let cache: { mtime: number; items: FeedItem[] } | null = null;

export async function loadSubstack(): Promise<FeedItem[]> {
  try {
    const stats = await stat(EXTERNAL_FEED_PATH);
    const mtime = stats.mtime.getTime();
    if (cache && cache.mtime === mtime) return cache.items;

    const raw = await readFile(EXTERNAL_FEED_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ExternalFeedFile;
    const items: FeedItem[] = (parsed.items ?? []).map((it) => ({
      ...it,
      type: "substack" as const,
    }));
    cache = { mtime, items };
    return items;
  } catch {
    return [];
  }
}
