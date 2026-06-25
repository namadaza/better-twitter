"use server";

import { createHash } from "crypto";
import type { FeedItem, FeedOptions } from "@/lib/types";
import { loadAllSources } from "@/lib/sources";

type BucketKey = "highlight" | "rss" | "book" | "islam";
type IslamBucketKey = "quran" | "hadith" | "highlight";

const ISLAMIC_BOOKS = new Set(["The Quran", "Mishkat al-Masabih"]);

const ISLAM_FEED_TITLE_PATTERNS = [
  "the quran",
  "mishkat al masabih",
  "islam between east and west",
  "autobiography of malcom x",
  "autobiography of malcolm x",
  "islam in liberalism",
  "quran tafsir",
  "road to mecca",
  "sirah of the prophet muhammad",
  "the islamic secular",
  "the sealed nectar",
  "winning the modern world for islam",
];

const SOURCE_WEIGHTS: Record<BucketKey, number> = {
  highlight: 4,
  rss: 4,
  book: 2,
  islam: 1,
};

const ISLAM_SOURCE_WEIGHTS: Record<IslamBucketKey, number> = {
  quran: 1,
  hadith: 1,
  highlight: 4,
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

function normalizeBookTitle(title: string) {
  return title
    .trim()
    .replace(/(?:,)?\s+by\s+[^:]+$/i, "")
    .replace(/\s*:\s*.*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[,;]\s*$/, "")
    .trim();
}

function parseHighlightBookTitle(rawTitle: string) {
  const trimmed = rawTitle.trim();
  const separators = [" - ", " > ", " Page "];

  for (const separator of separators) {
    const index = trimmed.indexOf(separator);
    if (index > 0) return trimmed.slice(0, index).trim();
  }

  return trimmed;
}

function normalizeForMatch(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesIslamTitle(title: string) {
  const normalized = normalizeForMatch(title);
  return ISLAM_FEED_TITLE_PATTERNS.some(
    (pattern) => normalized === pattern || normalized.includes(pattern),
  );
}

function isIslamFeedItem(item: FeedItem) {
  if (item.type === "rss") return false;

  if (item.type === "book") {
    return ISLAMIC_BOOKS.has(item.book) || matchesIslamTitle(item.book);
  }

  return (
    matchesIslamTitle(parseHighlightBookTitle(item.title)) ||
    matchesIslamTitle(item.title)
  );
}

function islamBucketFor(item: FeedItem): IslamBucketKey {
  if (item.type === "book" && item.book === "The Quran") return "quran";
  if (item.type === "book" && item.book === "Mishkat al-Masabih") return "hadith";
  return "highlight";
}

function orderIslamFeed(items: FeedItem[], seed: string) {
  const buckets: Record<IslamBucketKey, FeedItem[]> = {
    quran: [],
    hadith: [],
    highlight: [],
  };

  for (const item of items.filter(isIslamFeedItem)) {
    buckets[islamBucketFor(item)].push(item);
  }

  for (const key of Object.keys(buckets) as IslamBucketKey[]) {
    buckets[key] = shuffleWithSeed(
      [...buckets[key]].sort((a, b) => a.id.localeCompare(b.id)),
      makeSeededRandom(`${seed}:islam:${key}`),
    );
  }

  const scheduler = makeSeededRandom(`${seed}:islam:scheduler`);
  const ordered: FeedItem[] = [];

  while (buckets.quran.length || buckets.hadith.length || buckets.highlight.length) {
    const available = (Object.keys(buckets) as IslamBucketKey[]).filter(
      (key) => buckets[key].length > 0,
    );
    const totalWeight = available.reduce(
      (sum, key) => sum + ISLAM_SOURCE_WEIGHTS[key],
      0,
    );

    let roll = scheduler() * totalWeight;
    let selected = available[available.length - 1];

    for (const key of available) {
      roll -= ISLAM_SOURCE_WEIGHTS[key];
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

function isSelectedBookHighlight(item: FeedItem, selectedTitle: string) {
  const normalized = normalizeBookTitle(selectedTitle);

  if (item.type === "book") {
    return normalizeBookTitle(item.book) === normalized;
  }

  if (item.type === "highlight") {
    return normalizeBookTitle(parseHighlightBookTitle(item.title)) === normalized;
  }

  return false;
}

function orderConfiguredFeed(
  items: FeedItem[],
  seed: string,
  options: FeedOptions,
) {
  if (options.contentType === "art") return [];

  if (options.contentType === "islam") {
    return orderIslamFeed(items, seed);
  }

  if (options.contentType === "rss") {
    const rssItems = items.filter(
      (item): item is Extract<FeedItem, { type: "rss" }> => item.type === "rss",
    );

    if (options.rssOrder === "chronological") {
      return [...rssItems].sort((a, b) => {
        const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return bTime - aTime || b.id.localeCompare(a.id);
      });
    }

    return shuffleWithSeed(
      [...rssItems].sort((a, b) => a.id.localeCompare(b.id)),
      makeSeededRandom(`${seed}:rss`),
    );
  }

  const bookItems = items.filter((item) =>
    isSelectedBookHighlight(item, options.bookTitle),
  );

  if (options.bookOrder === "random") {
    return shuffleWithSeed(
      [...bookItems].sort((a, b) => a.id.localeCompare(b.id)),
      makeSeededRandom(`${seed}:book-highlights:${options.bookTitle}`),
    );
  }

  return bookItems;
}

export async function getFeedItems(
  seed: string = "default",
  options?: FeedOptions | null,
): Promise<FeedItem[]> {
  const all = await loadAllSources();

  if (options) return orderConfiguredFeed(all, seed, options);

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
  options?: FeedOptions | null,
): Promise<FeedItem[]> {
  const all = await getFeedItems(seed, options);
  return all.slice(offset, offset + count);
}
