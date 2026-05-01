"use server";

import { createHash } from "crypto";
import type { FeedItem } from "@/lib/types";
import { loadAllSources } from "@/lib/sources";

type BucketKey = "highlight" | "rss" | "book" | "islam";

const ISLAMIC_BOOKS = new Set(["The Quran", "Mishkat al-Masabih"]);

const SOURCE_WEIGHTS: Record<BucketKey, number> = {
  highlight: 4,
  rss: 4,
  book: 2,
  islam: 1,
};

function bucketFor(item: FeedItem): BucketKey {
  if (item.type === "book" && ISLAMIC_BOOKS.has(item.book)) return "islam";
  return item.type;
}

function makeSeededRandom(seed: string): () => number {
  const hash = createHash("sha256").update(seed).digest();
  let state = hash.readUInt32LE(0) || 1;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function getFeedItems(
  seed: string = "default",
): Promise<FeedItem[]> {
  const all = await loadAllSources();

  const buckets: Record<BucketKey, FeedItem[]> = {
    highlight: [],
    rss: [],
    book: [],
    islam: [],
  };
  for (const item of all) buckets[bucketFor(item)].push(item);

  for (const key of Object.keys(buckets) as BucketKey[]) {
    const sorted = [...buckets[key]].sort((a, b) => a.id.localeCompare(b.id));
    buckets[key] = shuffleWithSeed(sorted, makeSeededRandom(`${seed}:${key}`));
  }

  const scheduler = makeSeededRandom(seed);
  const ordered: FeedItem[] = [];

  while (
    buckets.highlight.length ||
    buckets.rss.length ||
    buckets.book.length ||
    buckets.islam.length
  ) {
    const available = (Object.keys(buckets) as BucketKey[]).filter(
      (key) => buckets[key].length > 0,
    );
    const totalWeight = available.reduce(
      (sum, key) => sum + SOURCE_WEIGHTS[key],
      0,
    );

    let roll = scheduler() * totalWeight;
    let selected = available[available.length - 1];

    for (const key of available) {
      roll -= SOURCE_WEIGHTS[key];
      if (roll < 0) {
        selected = key;
        break;
      }
    }

    const next = buckets[selected].pop();
    if (next) ordered.push(next);
  }

  return ordered;
}

export async function getFeedItemsPage(
  offset: number = 0,
  count: number = 50,
  seed: string = "default",
): Promise<FeedItem[]> {
  const all = await getFeedItems(seed);
  return all.slice(offset, offset + count);
}
