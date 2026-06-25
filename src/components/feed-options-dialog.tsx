"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KoreaderBook } from "@/lib/sources/koreader-generated";
import type { FeedItem, FeedOptions } from "@/lib/types";

type BookOption = {
  slug: string;
  title: string;
  author?: string;
};

type Props = {
  books: KoreaderBook[];
  highlights: Extract<FeedItem, { type: "highlight" }>[];
  feedOptions: FeedOptions | null;
  onFeedOptionsChange: (options: FeedOptions | null) => void;
};

type ContentType = "default" | FeedOptions["contentType"];

function normalizeBookTitle(title: string) {
  return title
    .trim()
    .replace(/(?:,)?\s+by\s+[^:]+$/i, "")
    .replace(/\s*:\s*.*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[,;]\s*$/, "")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseHighlightTitle(rawTitle: string) {
  const trimmed = rawTitle.trim();
  const separators = [" - ", " > ", " Page "];

  for (const separator of separators) {
    const index = trimmed.indexOf(separator);
    if (index > 0) return trimmed.slice(0, index).trim();
  }

  return trimmed;
}

function buildHighlightBooks(
  highlights: Extract<FeedItem, { type: "highlight" }>[],
): BookOption[] {
  const grouped = new Map<string, BookOption>();

  for (const item of highlights) {
    const title = normalizeBookTitle(parseHighlightTitle(item.title));
    const slug = `highlight-${slugify(title)}`;
    if (!grouped.has(slug)) grouped.set(slug, { slug, title });
  }

  return Array.from(grouped.values());
}

export function FeedOptionsDialog({
  books,
  highlights,
  feedOptions,
  onFeedOptionsChange,
}: Props) {
  const allBooks = useMemo<BookOption[]>(() => {
    const byTitle = new Map<string, BookOption>();

    for (const book of [...books, ...buildHighlightBooks(highlights)]) {
      const key = normalizeBookTitle(book.title);
      if (!byTitle.has(key)) byTitle.set(key, { ...book, title: key });
    }

    return Array.from(byTitle.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [books, highlights]);

  const [open, setOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(
    feedOptions?.contentType ?? "default",
  );
  const [selectedBookTitle, setSelectedBookTitle] = useState(
    feedOptions?.contentType === "book-highlights"
      ? feedOptions.bookTitle
      : allBooks[0]?.title ?? "",
  );
  const [bookOrder, setBookOrder] = useState<"random" | "in-order">(
    feedOptions?.contentType === "book-highlights"
      ? feedOptions.bookOrder
      : "random",
  );
  const [rssOrder, setRssOrder] = useState<"chronological" | "random">(
    feedOptions?.contentType === "rss" ? feedOptions.rssOrder : "chronological",
  );

  useEffect(() => {
    if (
      allBooks.length > 0 &&
      !allBooks.some((book) => book.title === selectedBookTitle)
    ) {
      setSelectedBookTitle(allBooks[0].title);
    }
  }, [allBooks, selectedBookTitle]);

  function applyOptions() {
    if (contentType === "default") {
      onFeedOptionsChange(null);
      setOpen(false);
      return;
    }

    if (contentType === "rss") {
      onFeedOptionsChange({ contentType, rssOrder });
      setOpen(false);
      return;
    }

    if (contentType === "art") {
      onFeedOptionsChange({ contentType });
      setOpen(false);
      return;
    }

    if (contentType === "islam") {
      onFeedOptionsChange({ contentType });
      setOpen(false);
      return;
    }

    if (!selectedBookTitle) return;
    onFeedOptionsChange({
      contentType,
      bookTitle: selectedBookTitle,
      bookOrder,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="size-4" />
        Feed Options
      </Button>

      <DialogContent className="w-[min(90vw,32rem)] sm:max-w-none overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Feed Options</DialogTitle>
          <DialogDescription>
            Choose what kind of content should appear in the feed.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          <label className="grid min-w-0 gap-2 text-base">
            <span className="font-medium">Content type</span>
            <select
              className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-base outline-none"
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value as ContentType)
              }
            >
              <option value="default">Default</option>
              <option value="book-highlights">Book Highlights</option>
              <option value="rss">RSS</option>
              <option value="art">Art</option>
              <option value="islam">Islam</option>
            </select>
          </label>

          {contentType === "default" && (
            <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Show the normal mixed feed with the existing weighted ordering.
            </p>
          )}

          {contentType === "book-highlights" && (
            <>
              <label className="grid min-w-0 gap-2 text-base">
                <span className="font-medium">Book</span>
                <select
                  className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-base outline-none"
                  value={selectedBookTitle}
                  onChange={(event) => setSelectedBookTitle(event.target.value)}
                  disabled={allBooks.length === 0}
                >
                  {allBooks.map((book) => (
                    <option key={book.slug} value={book.title}>
                      {book.title}
                      {book.author ? ` · ${book.author}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-base">
                <span className="font-medium">Order</span>
                <select
                  className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-base outline-none"
                  value={bookOrder}
                  onChange={(event) =>
                    setBookOrder(event.target.value as "random" | "in-order")
                  }
                >
                  <option value="random">Random</option>
                  <option value="in-order">In Order</option>
                </select>
              </label>
            </>
          )}

          {contentType === "rss" && (
            <label className="grid min-w-0 gap-2 text-base">
              <span className="font-medium">Order</span>
              <select
                className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-base outline-none"
                value={rssOrder}
                onChange={(event) =>
                  setRssOrder(event.target.value as "chronological" | "random")
                }
              >
                <option value="chronological">Chronological</option>
                <option value="random">Random Order</option>
              </select>
            </label>
          )}

          {contentType === "art" && (
            <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Show a randomized feed of WikiArt entries.
            </p>
          )}

          {contentType === "islam" && (
            <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              Show a randomized feed of Quran, hadith, and selected Islamic book highlights.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={applyOptions}
              disabled={contentType === "book-highlights" && allBooks.length === 0}
            >
              Apply to Feed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
