import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

type AphorismBookFile = {
  slug: string;
  title: string;
  author?: string;
  type: "aphorism";
  fetchedAt: string;
  items: Array<{
    text: string;
    source?: string;
    reference?: string;
    url?: string;
    secondaryText?: string;
  }>;
};

type MishkatInput = {
  metadata?: {
    english?: {
      title?: string;
      author?: string;
    };
  };
  chapters?: Array<{
    id: number;
    english?: string;
  }>;
  hadiths?: Array<{
    idInBook?: number;
    chapterId?: number;
    english?: {
      narrator?: string;
      text?: string;
    };
  }>;
};

const BOOKS_DIR = join(process.cwd(), "src", "lib", "data", "books");
const QURAN_MD_DIR = join(BOOKS_DIR, "quran-md");
const QURAN_OUT = join(BOOKS_DIR, "quran.json");
const MISHKAT_IN = join(BOOKS_DIR, "mishkat_almasabih.json");
const MISHKAT_OUT = join(BOOKS_DIR, "mishkat-al-masabih-feed.json");

function normalizeQuotedBlock(lines: string[]): string {
  return lines
    .map((line) => line.replace(/^>\s?/, "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseQuranMarkdown(
  filename: string,
  content: string,
): AphorismBookFile["items"] {
  const fileMatch = filename.match(/^(\d{3}) - (.+)\.md$/);
  if (!fileMatch) return [];

  const surahNumber = String(Number(fileMatch[1]));
  const surahName = fileMatch[2].trim();
  const lines = content.split(/\r?\n/);
  const items: AphorismBookFile["items"] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const headingMatch = lines[i].match(/^#### \[(\d+)\]/);
    if (!headingMatch) continue;

    const ayahNumber = String(Number(headingMatch[1]));
    const quoteBlocks: string[] = [];
    let currentBlock: string[] = [];

    for (i += 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith("#### [")) {
        i -= 1;
        break;
      }

      if (line.startsWith(">")) {
        currentBlock.push(line);
        continue;
      }

      if (currentBlock.length > 0) {
        quoteBlocks.push(normalizeQuotedBlock(currentBlock));
        currentBlock = [];
        if (quoteBlocks.length >= 2) break;
      }
    }

    if (currentBlock.length > 0 && quoteBlocks.length < 2) {
      quoteBlocks.push(normalizeQuotedBlock(currentBlock));
    }

    const [arabic, english] = quoteBlocks;
    if (!english || !arabic) continue;

    items.push({
      text: english,
      secondaryText: arabic,
      source: `Surah ${surahName}`,
      reference: `Ayah ${ayahNumber}`,
      url: `https://quran.com/${surahNumber}?startingVerse=${ayahNumber}`,
    });
  }

  return items;
}

async function buildQuranFeed(): Promise<AphorismBookFile> {
  const entries = await readdir(QURAN_MD_DIR);
  const markdownFiles = entries.filter((entry) => entry.endsWith(".md")).sort();
  const items: AphorismBookFile["items"] = [];

  for (const filename of markdownFiles) {
    const content = await readFile(join(QURAN_MD_DIR, filename), "utf-8");
    items.push(...parseQuranMarkdown(filename, content));
  }

  return {
    slug: "quran",
    title: "The Quran",
    author: "Al-Hilali & Muhsin Khan",
    type: "aphorism",
    fetchedAt: new Date().toISOString(),
    items,
  };
}

function cleanText(text: string): string {
  return text.replace(/\u00a0/g, " ").trim();
}

function joinHadithText(narrator?: string, text?: string): string {
  const parts = [cleanText(narrator ?? ""), cleanText(text ?? "")].filter(Boolean);
  return parts.join("\n\n").trim();
}

async function buildMishkatFeed(): Promise<AphorismBookFile> {
  const raw = await readFile(MISHKAT_IN, "utf-8");
  const data = JSON.parse(raw) as MishkatInput;
  const title = data.metadata?.english?.title?.trim() || "Mishkat al-Masabih";
  const author = data.metadata?.english?.author?.trim();
  const chapterNames = new Map(
    (data.chapters ?? []).map((chapter) => [
      chapter.id,
      chapter.english?.trim() || `Chapter ${chapter.id}`,
    ]),
  );

  const items = (data.hadiths ?? [])
    .map((hadith) => {
      const text = joinHadithText(
        hadith.english?.narrator,
        hadith.english?.text,
      );
      if (!text) return null;

      const chapterName = chapterNames.get(hadith.chapterId ?? -1);
      const locationParts = [
        chapterName ? `Chapter: ${chapterName}` : undefined,
        hadith.idInBook ? `Hadith ${hadith.idInBook}` : undefined,
      ].filter(Boolean);

      return {
        text,
        source: title,
        reference: locationParts.join(" · ") || undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    slug: "mishkat-al-masabih",
    title,
    author,
    type: "aphorism",
    fetchedAt: new Date().toISOString(),
    items,
  };
}

async function main() {
  const [quran, mishkat] = await Promise.all([
    buildQuranFeed(),
    buildMishkatFeed(),
  ]);

  await Promise.all([
    writeFile(QURAN_OUT, JSON.stringify(quran, null, 2) + "\n", "utf-8"),
    writeFile(MISHKAT_OUT, JSON.stringify(mishkat, null, 2) + "\n", "utf-8"),
  ]);

  console.log(
    `Wrote ${quran.items.length} Quran ayat to ${QURAN_OUT} and ${mishkat.items.length} hadith to ${MISHKAT_OUT}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
