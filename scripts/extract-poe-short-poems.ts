/**
 * One-time (or repeatable) extract: short lyric poems from the Project Gutenberg
 * "Works of Edgar Allan Poe, The Raven Edition" EPUB (this repo's local file).
 *
 * Skips tales, essays, notes, and long narrative poems via spine slice + length /
 * line-shape heuristics. Output matches src/lib/sources/books.ts "poem" shape.
 *
 * Usage:
 *   npx tsx scripts/extract-poe-short-poems.ts
 *   npx tsx scripts/extract-poe-short-poems.ts --epub /path/to/file.epub --max-chars 6500
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { load as loadHtml } from "cheerio";
import epub2 from "epub2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const EPub = (epub2 as { EPub?: unknown; default?: unknown }).EPub
  ?? (epub2 as { default?: unknown }).default
  ?? epub2;

const DEFAULT_EPUB = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "books",
  "The Works of Edgar Allan Poe, The Raven Edition by Edgar Allan Poe.epub",
);

const OUT_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "books",
  "poe-short-poems.json",
);

/** In this Gutenberg EPUB, manifest id itemK maps to 25525-h-(K-3).htm. */
const POETRY_SPINE_ID_MIN = 106; // h-103 … first “POEMS” page of volume V
const POETRY_SPINE_ID_MAX = 158; // h-155 … ends with “DOUBTFUL POEMS” file
const SKIP_CHAPTER_IDS = new Set(["item123"]); // h-120 = biographical NOTES only

/** Section headings: not individual poems. */
const EXCLUDE_HEADINGS = new Set([
  "poems",
  "poems of later life",
  "poems of manhood",
  "poems of youth",
  "doubtful poems",
  "introduction to poems—1831",
  "introduction to poems--1831",
  "minor poems",
  "preface",
  "contents",
]);

/** Narrative set-pieces (e.g. The Bells, Ulalume) need a higher --max-chars. */
const DEFAULT_MAX_CHARS = 4000;

function parseArgs(): { epubPath: string; maxChars: number } {
  let epubPath = DEFAULT_EPUB;
  let maxChars = DEFAULT_MAX_CHARS;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--epub" && argv[i + 1]) {
      epubPath = argv[i + 1]!;
      i++;
    } else if (argv[i] === "--max-chars" && argv[i + 1]) {
      maxChars = Math.max(500, parseInt(argv[i + 1]!, 10));
      i++;
    }
  }
  return { epubPath, maxChars };
}

function spineIdNumber(id: string): number | null {
  const m = /^item(\d+)$/i.exec(id);
  return m ? parseInt(m[1]!, 10) : null;
}

function shouldIncludeChapter(id: string): boolean {
  const n = spineIdNumber(id);
  if (n === null) return false;
  if (n < POETRY_SPINE_ID_MIN || n > POETRY_SPINE_ID_MAX) return false;
  if (SKIP_CHAPTER_IDS.has(id)) return false;
  return true;
}

function normalizeHeading(h: string): string {
  return h
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")
    .toLowerCase();
}

function displayTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().replace(/\.+$/, "") || "Untitled";
}

function avgLineLen(s: string): number {
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return 999;
  return lines.reduce((a, l) => a + l.length, 0) / lines.length;
}

/**
 * Gutenberg Poe poems usually use <pre> with short lines; prose notes use long
 * <p> blocks. Reject obvious prose (criticism, notes) that slipped past headings.
 */
function looksLikeVerse(body: string): boolean {
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 4) return false;
  const avg = avgLineLen(body);
  return avg < 95 || (lines.length >= 12 && avg < 120);
}

function isLikelyFrontMatter(text: string): boolean {
  const t = text.toLowerCase();
  if (text.length < 30) return true;
  if (/^contents\b/i.test(text)) return true;
  if (/^copyright/i.test(text)) return true;
  if (/all rights reserved/i.test(text)) return true;
  if (/^\*{3}\s*start of the project gutenberg/i.test(t)) return true;
  return false;
}

function splitOnHeadings(
  html: string,
): Array<{ heading: string; body: string }> {
  const $ = loadHtml(html);
  $("style, script").remove();
  $("br").replaceWith("\n");

  const groups: Array<{ heading: string; body: string }> = [];
  let current: { heading: string; bodyParts: string[] } | null = null;

  const flush = () => {
    if (current) {
      const body = current.bodyParts
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n\n");
      if (body) groups.push({ heading: current.heading, body });
    }
  };

  const visit = (nodes: any[]) => {
    for (const node of nodes) {
      const tag = node.tagName?.toLowerCase?.() ?? "";
      if (!tag) continue;

      const text = $(node).text().replace(/\u00a0/g, " ").trim();
      if (/^h[1-6]$/.test(tag)) {
        flush();
        current = { heading: text, bodyParts: [] };
        continue;
      }

      const childElements = ($(node).children().toArray() as any[]).filter(
        (child: any) => child.tagName,
      );

      if (
        tag === "p" ||
        tag === "li" ||
        tag === "blockquote" ||
        tag === "pre"
      ) {
        if (current && text) current.bodyParts.push(text);
        continue;
      }

      if (childElements.length > 0) {
        visit(childElements);
        continue;
      }

      if (current && text) {
        current.bodyParts.push(text);
      }
    }
  };

  visit($("body").contents().toArray() as any[]);
  flush();
  return groups;
}

type PoemItem = { title: string; body: string };

async function extractShortPoems(
  epubPath: string,
  maxChars: number,
): Promise<PoemItem[]> {
  const EPubCtor = EPub as {
    createAsync: (path: string) => Promise<{ flow: { id: string }[]; getChapterRawAsync: (id: string) => Promise<string> }>;
  };
  const epub = await EPubCtor.createAsync(epubPath);
  const flow = epub.flow as { id: string }[];

  const chapters = flow
    .filter((ch) => shouldIncludeChapter(ch.id))
    .sort(
      (a, b) =>
        (spineIdNumber(a.id) ?? 0) - (spineIdNumber(b.id) ?? 0),
    );

  const items: PoemItem[] = [];
  const seen = new Set<string>();

  for (const ch of chapters) {
    const html = await epub.getChapterRawAsync(ch.id);
    for (const g of splitOnHeadings(html)) {
      const nh = normalizeHeading(g.heading);
      if (EXCLUDE_HEADINGS.has(nh)) continue;
      const body = g.body.trim();
      if (body.length < 50 || body.length > maxChars) continue;
      if (isLikelyFrontMatter(body)) continue;
      if (!looksLikeVerse(body)) continue;

      const title = displayTitle(g.heading);
      const displayBody = `${title}\n\n${body}`;

      const dedupeKey = `${title}\n${body.slice(0, 200)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      items.push({ title, body: displayBody });
    }
  }

  return items;
}

async function main(): Promise<void> {
  const { epubPath, maxChars } = parseArgs();
  console.log(`Reading ${epubPath}`);
  console.log(`maxChars=${maxChars} (set lower for stricter “micro” feed, higher to include e.g. The Raven)`);

  const poemItems = await extractShortPoems(epubPath, maxChars);
  await mkdir(join(process.cwd(), "src", "lib", "data", "books"), {
    recursive: true,
  });

  const output = {
    slug: "poe-short-poems",
    title: "Poe: Short Poems (Raven Edition)",
    author: "Edgar Allan Poe",
    type: "poem" as const,
    strategy: "poe-raven-edition-poetry-spine",
    fetchedAt: new Date().toISOString(),
    sourceNote:
      "Extracted from Project Gutenberg Raven Edition volume V (poetry); prose volumes omitted.",
    items: poemItems,
  };

  await writeFile(
    OUT_PATH,
    JSON.stringify(output, null, 2) + "\n",
    "utf-8",
  );

  console.log(`Wrote ${poemItems.length} poems → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
