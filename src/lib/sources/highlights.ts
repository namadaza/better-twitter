import { readFile, stat } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import type { FeedItem } from "@/lib/types";

type HighlightItem = Extract<FeedItem, { type: "highlight" }>;

const HIGHLIGHTS_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "highlights.md",
);

let cache: { mtime: number; items: HighlightItem[] } | null = null;

function parseHighlights(markdown: string): HighlightItem[] {
  const parts = markdown.split(/###\s+/).filter(Boolean);
  const items: HighlightItem[] = [];

  for (const block of parts) {
    const [titleLine, ...bodyLines] = block.trim().split("\n");
    const title = titleLine?.trim() ?? "";
    const text = bodyLines.join("\n").trim();

    if (!title || !text) continue;
    if (text.length < 10) continue;
    const firstChar = text[0];
    if (
      firstChar === firstChar.toLowerCase() &&
      firstChar !== firstChar.toUpperCase()
    ) {
      continue;
    }

    const id =
      "highlight-" +
      createHash("sha1").update(`${title}\n${text}`).digest("hex").slice(0, 12);

    items.push({ type: "highlight", id, title, text });
  }

  return items;
}

export async function loadHighlights(): Promise<HighlightItem[]> {
  try {
    const stats = await stat(HIGHLIGHTS_PATH);
    const mtime = stats.mtime.getTime();
    if (cache && cache.mtime === mtime) return cache.items;

    const markdown = await readFile(HIGHLIGHTS_PATH, "utf-8");
    const items = parseHighlights(markdown);
    cache = { mtime, items };
    return items;
  } catch (error) {
    console.error("Error loading highlights:", error);
    return [];
  }
}
