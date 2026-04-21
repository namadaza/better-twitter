/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdir, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { join } from "path";
import { load as loadHtml } from "cheerio";
// `epub2` ships CJS and its runtime shape varies under tsx/ESM interop.
import epub2 from "epub2";
import {
  BOOK_SOURCES,
  type BookSource,
  type BookStrategy,
} from "./book-sources";

const EPub =
  (epub2 as any)?.EPub ?? (epub2 as any)?.default ?? (epub2 as any);

type PoemItem = { title: string; body: string };
type AphorismItem = { text: string };
type AnyItem = PoemItem | AphorismItem;

const TMP_DIR = join(process.cwd(), ".tmp", "epubs");
const OUT_DIR = join(process.cwd(), "src", "lib", "data", "books");

async function downloadEpub(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  await pipeline(
    Readable.fromWeb(res.body as any),
    createWriteStream(dest),
  );
}

function htmlToText(html: string): string {
  const $ = loadHtml(html);
  $("style, script").remove();
  $("br").replaceWith("\n");
  const blocks: string[] = [];
  $("body")
    .find("p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div")
    .each((_, el) => {
      const t = $(el).text().replace(/ /g, " ").trim();
      if (t) blocks.push(t);
    });
  if (!blocks.length) {
    const t = $("body").text().replace(/ /g, " ").trim();
    if (t) blocks.push(t);
  }
  return blocks.join("\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

function htmlToParagraphs(html: string): string[] {
  const $ = loadHtml(html);
  $("style, script").remove();
  $("br").replaceWith("\n");
  const paras: string[] = [];
  $("body p, body li, body blockquote").each((_, el) => {
    const t = $(el).text().replace(/ /g, " ").trim();
    if (t) paras.push(t);
  });
  return paras;
}

function splitOnHeadings(html: string): Array<{ heading: string; body: string }> {
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

      const text = $(node).text().replace(/ /g, " ").trim();
      if (/^h[1-6]$/.test(tag)) {
        flush();
        current = { heading: text, bodyParts: [] };
        continue;
      }

      const childElements = ($(node).children().toArray() as any[]).filter(
        (child) => child.tagName,
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

function isLikelyFrontMatter(text: string): boolean {
  const t = text.toLowerCase();
  if (text.length < 20) return true;
  if (/^contents\b/i.test(text)) return true;
  if (/^copyright/i.test(text)) return true;
  if (/all rights reserved/i.test(text)) return true;
  if (/^isbn\b/i.test(t)) return true;
  if (/table of contents/i.test(t)) return true;
  if (/printed in the/i.test(t)) return true;
  return false;
}

async function openEpub(file: string): Promise<any> {
  const inst = await EPub.createAsync(file);
  return inst;
}

async function chapterHtmls(
  epub: any,
  book: BookSource,
): Promise<Array<{ id: string; title: string; html: string }>> {
  const out: Array<{ id: string; title: string; html: string }> = [];
  const excludedIds = new Set(book.excludeChapterIds ?? []);
  for (const ch of epub.flow as Array<{ id: string; title?: string }>) {
    if (excludedIds.has(ch.id)) continue;
    const html = await epub.getChapterRawAsync(ch.id);
    out.push({ id: ch.id, title: (ch.title ?? "").trim(), html });
  }
  return out;
}

async function extractPoemsChapterAsPoem(
  epub: any,
  book: BookSource,
): Promise<PoemItem[]> {
  const chapters = await chapterHtmls(epub, book);
  const items: PoemItem[] = [];
  for (const ch of chapters) {
    const body = htmlToText(ch.html);
    if (!body || body.length < 40) continue;
    if (isLikelyFrontMatter(body)) continue;
    items.push({ title: ch.title || "Untitled", body });
  }
  return items;
}

async function extractPoemsHeadingSplit(
  epub: any,
  book: BookSource,
): Promise<PoemItem[]> {
  const chapters = await chapterHtmls(epub, book);
  const items: PoemItem[] = [];
  const excludedHeadings = new Set(
    (book.excludeHeadings ?? []).map((heading) => heading.trim().toLowerCase()),
  );
  for (const ch of chapters) {
    const groups = splitOnHeadings(ch.html);
    if (groups.length === 0) {
      const body = htmlToText(ch.html);
      if (body && !isLikelyFrontMatter(body) && body.length >= 40) {
        items.push({ title: ch.title || "Untitled", body });
      }
      continue;
    }
    for (const g of groups) {
      if (excludedHeadings.has(g.heading.trim().toLowerCase())) continue;
      if (!g.body || g.body.length < 40) continue;
      if (isLikelyFrontMatter(g.body)) continue;
      items.push({ title: g.heading || ch.title || "Untitled", body: g.body });
    }
  }
  return items;
}

async function extractAphorismsParagraphs(
  epub: any,
  book: BookSource,
): Promise<AphorismItem[]> {
  const chapters = await chapterHtmls(epub, book);
  const items: AphorismItem[] = [];
  for (const ch of chapters) {
    for (const p of htmlToParagraphs(ch.html)) {
      if (p.length < 25) continue;
      if (isLikelyFrontMatter(p)) continue;
      items.push({ text: p });
    }
  }
  return items;
}

async function extractNumberedVerses(
  epub: any,
  book: BookSource,
): Promise<AphorismItem[]> {
  const chapters = await chapterHtmls(epub, book);
  const items: AphorismItem[] = [];
  // Matches leading numbering like "1", "1.", "1)", "I." optionally followed by
  // whitespace. Treat each numbered block as its own verse.
  const marker = /^\s*(\d+|[IVXLCM]+)[.\)\s]/;
  for (const ch of chapters) {
    const paras = htmlToParagraphs(ch.html);
    // Group consecutive paragraphs under the same numbered marker.
    let buf: string[] = [];
    const flushBuf = () => {
      const joined = buf.join("\n\n").trim();
      buf = [];
      if (!joined) return;
      const stripped = joined.replace(marker, "").trim();
      if (stripped.length >= 10 && !isLikelyFrontMatter(stripped)) {
        items.push({ text: stripped });
      }
    };
    for (const p of paras) {
      if (marker.test(p)) {
        flushBuf();
      }
      buf.push(p);
    }
    flushBuf();
  }
  // Fallback: if nothing numbered was found, treat non-trivial paragraphs as
  // verses directly.
  if (items.length === 0) {
    return extractAphorismsParagraphs(epub, book);
  }
  return items;
}

async function extract(
  epub: any,
  book: BookSource,
  strategy: BookStrategy,
): Promise<AnyItem[]> {
  switch (strategy) {
    case "chapter-as-poem":
      return extractPoemsChapterAsPoem(epub, book);
    case "heading-split-poems":
      return extractPoemsHeadingSplit(epub, book);
    case "paragraph-aphorisms":
      return extractAphorismsParagraphs(epub, book);
    case "numbered-verse-aphorisms":
      return extractNumberedVerses(epub, book);
  }
}

async function processBook(book: BookSource, baseUrl: string): Promise<void> {
  const url = baseUrl.replace(/\/$/, "") + "/" + encodeURI(book.path);
  const epubPath = join(TMP_DIR, `${book.slug}.epub`);

  console.log(`[${book.slug}] downloading ${url}`);
  await downloadEpub(url, epubPath);

  console.log(`[${book.slug}] parsing`);
  const epub = await openEpub(epubPath);
  const rawItems = await extract(epub, book, book.strategy);

  const items =
    book.type === "poem"
      ? (rawItems as PoemItem[]).map((it) => ({
          title: it.title,
          body: it.body,
        }))
      : (rawItems as AphorismItem[]).map((it) => ({ text: it.text }));

  const output = {
    slug: book.slug,
    title: book.title,
    author: book.author,
    type: book.type,
    strategy: book.strategy,
    fetchedAt: new Date().toISOString(),
    items,
  };

  const outPath = join(OUT_DIR, `${book.slug}.json`);
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`[${book.slug}] wrote ${items.length} items → ${outPath}`);
}

function parseOnly(): string | null {
  const idx = process.argv.indexOf("--only");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return null;
}

async function main(): Promise<void> {
  const baseUrl = process.env.BOOK_BLOB_BASE_URL;
  if (!baseUrl) {
    console.error(
      "BOOK_BLOB_BASE_URL env var is required. Example:\n" +
        "  BOOK_BLOB_BASE_URL=https://<store>.public.blob.vercel-storage.com/better-twitter npm run extract:books",
    );
    process.exit(1);
  }

  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const only = parseOnly();
  const books = only
    ? BOOK_SOURCES.filter((b) => b.slug === only)
    : BOOK_SOURCES;
  if (only && books.length === 0) {
    console.error(`Unknown --only slug: ${only}`);
    process.exit(1);
  }

  for (const book of books) {
    try {
      await processBook(book, baseUrl);
    } catch (error) {
      console.error(`[${book.slug}] failed:`, error);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
