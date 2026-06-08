import { readFile, readdir } from "fs/promises";
import { join } from "path";

export type KoreaderHighlight = {
  text: string;
  source?: string;
  reference?: string;
};

export type KoreaderBook = {
  slug: string;
  title: string;
  author?: string;
  fetchedAt?: string;
  items: KoreaderHighlight[];
};

type ParsedKoreaderBook = {
  slug?: string;
  title?: string;
  author?: string;
  fetchedAt?: string;
  items?: Array<{
    text?: string;
    source?: string;
    reference?: string;
  }>;
};

const GENERATED_DIR = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "books",
  "koreader-generated",
);

export async function loadKoreaderBooks(): Promise<KoreaderBook[]> {
  let files: string[];

  try {
    const entries = await readdir(GENERATED_DIR, { withFileTypes: true });
    files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name);
  } catch {
    return [];
  }

  const books = await Promise.all(
    files.map(async (file) => {
      try {
        const raw = await readFile(join(GENERATED_DIR, file), "utf8");
        const parsed = JSON.parse(raw) as ParsedKoreaderBook;
        if (
          !parsed ||
          typeof parsed !== "object" ||
          typeof parsed.slug !== "string" ||
          typeof parsed.title !== "string" ||
          !Array.isArray(parsed.items)
        ) {
          return null;
        }

        const items: KoreaderHighlight[] = parsed.items
          .filter(
            (item): item is { text: string; source?: string; reference?: string } =>
              typeof item?.text === "string",
          )
          .map((item) => ({
            text: item.text,
            source: item.source,
            reference: item.reference,
          }));

        const book: KoreaderBook = {
          slug: parsed.slug,
          title: parsed.title,
          items,
        };

        if (typeof parsed.author === "string") {
          book.author = parsed.author;
        }

        if (typeof parsed.fetchedAt === "string") {
          book.fetchedAt = parsed.fetchedAt;
        }

        return book;
      } catch {
        return null;
      }
    }),
  );

  return books.filter((book): book is KoreaderBook => Boolean(book)).sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}
