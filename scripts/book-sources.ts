export type BookStrategy =
  | "chapter-as-poem"
  | "heading-split-poems"
  | "paragraph-aphorisms"
  | "numbered-verse-aphorisms";

export interface BookSource {
  slug: string;
  title: string;
  author: string;
  type: "poem" | "aphorism";
  strategy: BookStrategy;
  /** Filename appended to BOOK_BLOB_BASE_URL. */
  path: string;
  /** Optional EPUB spine item ids to skip entirely. */
  excludeChapterIds?: string[];
  /** Optional extracted heading titles to skip. */
  excludeHeadings?: string[];
}

export const BOOK_SOURCES: BookSource[] = [
  {
    slug: "procrustes",
    title: "The Bed of Procrustes",
    author: "Nassim Nicholas Taleb",
    type: "aphorism",
    strategy: "paragraph-aphorisms",
    path: "The Bed of Procrustes by Taleb.epub",
  },
  {
    slug: "golden-treasury",
    title: "The Golden Treasury",
    author: "Francis Turner Palgrave",
    type: "poem",
    strategy: "heading-split-poems",
    path: "The Golden Treasury by Palgrave.epub",
  },
  {
    slug: "crescent-moon",
    title: "The Crescent Moon",
    author: "Rabindranath Tagore",
    type: "poem",
    strategy: "chapter-as-poem",
    path: "Crescent Moon by Tagore.epub",
    excludeChapterIds: ["titlepage", "id243", "id242", "id241"],
  },
  {
    slug: "gitanjali",
    title: "Gitanjali",
    author: "Rabindranath Tagore",
    type: "poem",
    strategy: "heading-split-poems",
    path: "Gitanjali by Tagore.epub",
    excludeChapterIds: ["coverpage-wrapper", "pg-header", "item4", "pg-footer"],
    excludeHeadings: ["GITANJALI"],
  },
  {
    slug: "stray-birds",
    title: "Stray Birds",
    author: "Rabindranath Tagore",
    type: "aphorism",
    strategy: "numbered-verse-aphorisms",
    path: "Stray Birds by Tagore.epub",
  },
  {
    slug: "north-of-boston",
    title: "North of Boston",
    author: "Robert Frost",
    type: "poem",
    strategy: "chapter-as-poem",
    path: "North of Boston by Frost.epub",
  },
];
