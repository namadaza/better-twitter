import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import type { FeedItem } from "@/lib/types";

const BOOKS_DIR = join(process.cwd(), "src", "lib", "data", "books");
const IGNORED_DIRS = new Set(["koreader-highlights"]);

type BookFile = {
  slug: string;
  title: string;
  author?: string;
  type: "poem" | "aphorism";
  fetchedAt?: string;
  items: Array<{
    title?: string;
    text?: string;
    body?: string;
    source?: string;
    reference?: string;
    url?: string;
    secondaryText?: string;
  }>;
};

type CacheEntry = { mtime: number; items: FeedItem[] };
const cache = new Map<string, CacheEntry>();

function itemId(slug: string, natural: string): string {
  return (
    slug +
    "-" +
    createHash("sha1").update(natural).digest("hex").slice(0, 12)
  );
}

function fanOut(book: BookFile): FeedItem[] {
  const out: FeedItem[] = [];
  for (const raw of book.items) {
    if (book.type === "poem") {
      const body = (raw.body ?? raw.text ?? "").trim();
      const title = (raw.title ?? "").trim();
      if (!body) continue;
      out.push({
        type: "poem",
        id: itemId(book.slug, `${title}\n${body}`),
        title: title || "Untitled",
        author: book.author ?? "",
        book: book.title,
        body,
      });
    } else {
      const text = (raw.text ?? raw.body ?? "").trim();
      if (!text) continue;
      out.push({
        type: "aphorism",
        id: itemId(book.slug, text),
        text,
        author: book.author,
        book: book.title,
        source: raw.source?.trim() || undefined,
        reference: raw.reference?.trim() || undefined,
        url: raw.url?.trim() || undefined,
        secondaryText: raw.secondaryText?.trim() || undefined,
      });
    }
  }
  return out;
}

async function loadBookFile(path: string): Promise<FeedItem[]> {
  const stats = await stat(path);
  const mtime = stats.mtime.getTime();
  const cached = cache.get(path);
  if (cached && cached.mtime === mtime) return cached.items;

  const raw = await readFile(path, "utf-8");
  const book = JSON.parse(raw) as Partial<BookFile>;
  if (
    !book ||
    typeof book !== "object" ||
    typeof book.slug !== "string" ||
    typeof book.title !== "string" ||
    (book.type !== "poem" && book.type !== "aphorism") ||
    !Array.isArray(book.items)
  ) {
    cache.set(path, { mtime, items: [] });
    return [];
  }

  const items = fanOut(book as BookFile);
  cache.set(path, { mtime, items });
  return items;
}

async function collectBookFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) return [];
        return collectBookFiles(path);
      }
      return entry.name.endsWith(".json") ? [path] : [];
    }),
  );

  return nested.flat();
}

export async function loadBooks(): Promise<FeedItem[]> {
  let files: string[];
  try {
    files = await collectBookFiles(BOOKS_DIR);
  } catch {
    return [];
  }

  const nested = await Promise.all(
    files.map(async (path) => {
      try {
        return await loadBookFile(path);
      } catch (error) {
        console.error(`Error loading book ${path}:`, error);
        return [];
      }
    }),
  );
  return nested.flat();
}
