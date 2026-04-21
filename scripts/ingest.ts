import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { createHash } from "crypto";
import Parser from "rss-parser";
import { SUBSTACK_FOLLOWS } from "./substack-follows";

type SubstackItem = {
  type: "substack";
  id: string;
  title: string;
  url: string;
  publication: string;
  author?: string;
  excerpt?: string;
  publishedAt?: string;
};

type ExternalFeedFile = {
  fetchedAt: string;
  items: SubstackItem[];
};

const OUT_PATH = join(
  process.cwd(),
  "src",
  "lib",
  "data",
  "external-feed.json",
);

const EXCERPT_LIMIT = 320;

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent":
      "better-twitter-ingest/1.0 (+https://github.com/namadaza/better-twitter)",
  },
});

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.trimEnd() + "…";
}

function publicationName(feedTitle: string | undefined, url: string): string {
  if (feedTitle && feedTitle.trim()) return feedTitle.trim();
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function idFor(url: string): string {
  return "substack-" + createHash("sha1").update(url).digest("hex").slice(0, 12);
}

async function fetchPublication(baseUrl: string): Promise<SubstackItem[]> {
  const feedUrl = baseUrl.replace(/\/$/, "") + "/feed";
  const feed = await parser.parseURL(feedUrl);
  const publication = publicationName(feed.title, baseUrl);
  const items: SubstackItem[] = [];

  for (const entry of feed.items ?? []) {
    const link = entry.link?.trim();
    const title = entry.title?.trim();
    if (!link || !title) continue;

    const rawExcerpt =
      entry.contentSnippet ||
      (entry.summary ? stripHtml(entry.summary) : "") ||
      (entry.content ? stripHtml(entry.content) : "");
    const excerpt = rawExcerpt ? truncate(rawExcerpt, EXCERPT_LIMIT) : undefined;

    items.push({
      type: "substack",
      id: idFor(link),
      title,
      url: link,
      publication,
      author: entry.creator?.trim() || undefined,
      excerpt,
      publishedAt: entry.isoDate || entry.pubDate || undefined,
    });
  }
  return items;
}

async function loadExisting(): Promise<SubstackItem[]> {
  try {
    const raw = await readFile(OUT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ExternalFeedFile>;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  await mkdir(join(process.cwd(), "src", "lib", "data"), { recursive: true });

  if (SUBSTACK_FOLLOWS.length === 0) {
    console.warn(
      "No publications configured in scripts/substack-follows.ts; writing empty feed.",
    );
  }

  const results = await Promise.allSettled(
    SUBSTACK_FOLLOWS.map((u) => fetchPublication(u)),
  );

  const fresh: SubstackItem[] = [];
  results.forEach((r, i) => {
    const pub = SUBSTACK_FOLLOWS[i];
    if (r.status === "fulfilled") {
      console.log(`[${pub}] ${r.value.length} items`);
      fresh.push(...r.value);
    } else {
      console.error(`[${pub}] failed:`, r.reason);
    }
  });

  const existing = await loadExisting();
  const merged = new Map<string, SubstackItem>();
  for (const it of existing) merged.set(it.id, it);
  for (const it of fresh) merged.set(it.id, it);

  const items = [...merged.values()].sort((a, b) => {
    const ad = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bd = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bd - ad;
  });

  const MAX_ITEMS = 500;
  const trimmed = items.slice(0, MAX_ITEMS);

  const output: ExternalFeedFile = {
    fetchedAt: new Date().toISOString(),
    items: trimmed,
  };

  await writeFile(OUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`Wrote ${trimmed.length} items → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
