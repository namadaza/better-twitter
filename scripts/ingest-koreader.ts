import { createHash } from "crypto";
import { basename, extname, join } from "path";
import {
  mkdir,
  readdir,
  readFile,
  unlink,
  writeFile,
} from "fs/promises";

type KOReaderExport = {
  documents?: KOReaderDocument[];
};

type KOReaderDocument = {
  title?: string;
  author?: string;
  file?: string;
  entries?: KOReaderEntry[];
};

type KOReaderEntry = {
  chapter?: string;
  page?: number | string;
  sort?: string;
  text?: string;
  time?: number;
};

type BookItem = {
  text: string;
  source?: string;
  reference?: string;
  _time?: number;
};

type GeneratedBook = {
  slug: string;
  title: string;
  author?: string;
  type: "aphorism";
  fetchedAt?: string;
  items: Array<{
    text: string;
    source?: string;
    reference?: string;
  }>;
};

const RAW_DIR = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "books",
  "koreader-highlights",
);

const OUT_DIR = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "books",
  "koreader-generated",
);

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function normalizeMultiline(value: string): string {
  return value
    .split(/\r?\n/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(", ");
}

function normalizeText(value: string): string {
  return normalizeWhitespace(value.replace(/\u00a0/g, " "));
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function cleanAuthor(rawAuthor: string | undefined): string | undefined {
  if (!rawAuthor) return undefined;
  const author = normalizeMultiline(rawAuthor);
  if (!author || /^unknown author$/i.test(author)) return undefined;
  return author;
}

function fallbackTitleFromFile(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  const name = basename(filePath, extname(filePath))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return undefined;
  return name.replace(/\s+by\s+.+$/i, "").trim() || name;
}

function cleanTitle(
  rawTitle: string | undefined,
  filePath: string | undefined,
): string {
  const title = rawTitle ? normalizeMultiline(rawTitle) : "";
  const fallback = fallbackTitleFromFile(filePath);
  const suspicious =
    !title ||
    (/^[a-z0-9]+$/.test(title) && !/\s/.test(title) && title.length >= 6);

  return suspicious ? fallback || title || "Untitled KOReader Book" : title;
}

function chapterLabel(rawChapter: string | undefined): string | undefined {
  if (!rawChapter) return undefined;
  const chapter = normalizeMultiline(rawChapter);
  return chapter || undefined;
}

function pageLabel(page: number | string | undefined): string | undefined {
  if (page === undefined || page === null || page === "") return undefined;
  const text = normalizeWhitespace(String(page));
  return text ? `p. ${text}` : undefined;
}

function buildReference(entry: KOReaderEntry): string | undefined {
  const parts = [chapterLabel(entry.chapter), pageLabel(entry.page)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function fileBookKey(doc: KOReaderDocument): string {
  const title = cleanTitle(doc.title, doc.file);
  const author = cleanAuthor(doc.author) || "";
  const filePath = normalizeWhitespace(doc.file || "");
  return [filePath, title, author].filter(Boolean).join("::");
}

function bookSlug(doc: KOReaderDocument): string {
  const title = cleanTitle(doc.title, doc.file);
  const base = slugify(title) || "book";
  return `koreader-${base}-${shortHash(fileBookKey(doc))}`;
}

function itemKey(doc: KOReaderDocument, text: string): string {
  return `${fileBookKey(doc)}::${normalizeText(text).toLowerCase()}`;
}

function isBetterItem(next: BookItem, prev: BookItem): boolean {
  const nextTime = next._time ?? 0;
  const prevTime = prev._time ?? 0;
  if (nextTime !== prevTime) return nextTime > prevTime;

  const nextMeta = `${next.source || ""} ${next.reference || ""}`.trim().length;
  const prevMeta = `${prev.source || ""} ${prev.reference || ""}`.trim().length;
  return nextMeta > prevMeta;
}

async function loadExports(): Promise<KOReaderDocument[]> {
  const entries = await readdir(RAW_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const docs: KOReaderDocument[] = [];
  for (const file of files) {
    const path = join(RAW_DIR, file);
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as KOReaderExport;
    if (Array.isArray(parsed.documents)) {
      docs.push(...parsed.documents);
    }
  }

  return docs;
}

function buildBooks(documents: KOReaderDocument[]): GeneratedBook[] {
  const books = new Map<
    string,
    {
      slug: string;
      title: string;
      author?: string;
      items: Map<string, BookItem>;
    }
  >();

  for (const doc of documents) {
    const title = cleanTitle(doc.title, doc.file);
    const author = cleanAuthor(doc.author);
    const slug = bookSlug(doc);
    const bookKey = fileBookKey(doc);

    const existing =
      books.get(bookKey) ||
      (() => {
        const created = {
          slug,
          title,
          author,
          items: new Map<string, BookItem>(),
        };
        books.set(bookKey, created);
        return created;
      })();

    for (const entry of doc.entries || []) {
      if (entry.sort && entry.sort !== "highlight") continue;
      const text = normalizeText(entry.text || "");
      if (!text) continue;
      const reference = buildReference(entry);

      const item: BookItem = {
        text,
        source: title,
        reference: reference ? [author, reference].filter(Boolean).join(" · ") : author,
        _time: typeof entry.time === "number" ? entry.time : undefined,
      };

      const key = itemKey(doc, text);
      const previous = existing.items.get(key);
      if (!previous || isBetterItem(item, previous)) {
        existing.items.set(key, item);
      }
    }
  }

  return [...books.values()]
    .map((book) => {
      const latestTime = [...book.items.values()].reduce(
        (max, item) => Math.max(max, item._time ?? 0),
        0,
      );

      return {
        slug: book.slug,
        title: book.title,
        author: book.author,
        type: "aphorism" as const,
        fetchedAt:
          latestTime > 0 ? new Date(latestTime * 1000).toISOString() : undefined,
        items: [...book.items.values()]
          .sort((a, b) => (b._time ?? 0) - (a._time ?? 0))
          .map(({ _time, ...item }) => item),
      };
    })
    .filter((book) => book.items.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function writeBooks(books: GeneratedBook[]): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const existingEntries = await readdir(OUT_DIR, { withFileTypes: true });
  const existingFiles = new Set(
    existingEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name),
  );

  const nextFiles = new Set<string>();
  for (const book of books) {
    const fileName = `${book.slug}.json`;
    nextFiles.add(fileName);
    const outPath = join(OUT_DIR, fileName);
    await writeFile(outPath, JSON.stringify(book, null, 2) + "\n", "utf8");
    console.log(`[${book.slug}] wrote ${book.items.length} items → ${outPath}`);
  }

  for (const fileName of existingFiles) {
    if (nextFiles.has(fileName)) continue;
    await unlink(join(OUT_DIR, fileName));
    console.log(`[cleanup] removed stale ${fileName}`);
  }
}

async function main(): Promise<void> {
  const documents = await loadExports();
  const books = buildBooks(documents);
  await writeBooks(books);
  const itemCount = books.reduce((sum, book) => sum + book.items.length, 0);
  console.log(`Processed ${documents.length} documents into ${books.length} books and ${itemCount} highlights.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
