"use server";

import { createHash } from "crypto";
import type { FeedItem } from "@/lib/types";
import { loadAllSources } from "@/lib/sources";

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

function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export async function getFeedItems(seed: string = "default"): Promise<FeedItem[]> {
  const all = await loadAllSources();
  const random = makeSeededRandom(seed);
  const externalRandom = makeSeededRandom(`${seed}:substack`);

  const external = all
    .filter((item): item is Extract<FeedItem, { type: "substack" }> => {
      return item.type === "substack";
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const shuffledExternal = shuffleWithSeed(external, externalRandom);

  const local = shuffleWithSeed(
    all
      .filter((item) => item.type !== "substack")
      .sort((a, b) => a.id.localeCompare(b.id)),
    random,
  );

  if (shuffledExternal.length === 0) return local;
  if (local.length === 0) return shuffledExternal;

  const mixed: FeedItem[] = [];
  let localCursor = 0;
  let externalCursor = 0;

  while (
    localCursor < local.length ||
    externalCursor < shuffledExternal.length
  ) {
    const localGap = randomInt(2, 5, random);
    let addedLocal = 0;

    while (localCursor < local.length && addedLocal < localGap) {
      mixed.push(local[localCursor++]);
      addedLocal += 1;
    }

    if (externalCursor < shuffledExternal.length) {
      mixed.push(shuffledExternal[externalCursor++]);
    }

    if (
      localCursor >= local.length &&
      externalCursor < shuffledExternal.length
    ) {
      mixed.push(...shuffledExternal.slice(externalCursor));
      break;
    }
  }

  return mixed;
}

export async function getFeedItemsPage(
  offset: number = 0,
  count: number = 50,
  seed: string = "default",
): Promise<FeedItem[]> {
  const all = await getFeedItems(seed);
  return all.slice(offset, offset + count);
}
