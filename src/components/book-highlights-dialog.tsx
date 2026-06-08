"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeedItem } from "@/lib/types";
import type { KoreaderBook } from "@/lib/sources/koreader-generated";

type BookOption = {
  slug: string;
  title: string;
  author?: string;
  items: Array<{ text: string; reference?: string }>;
};

type Props = {
  books: KoreaderBook[];
  highlights: Extract<FeedItem, { type: "highlight" }>[];
};

function buildHighlightBooks(
  highlights: Extract<FeedItem, { type: "highlight" }>[],
): BookOption[] {
  function normalizeBookTitle(title: string) {
    return title
      .trim()
      .replace(/(?:,)?\s+by\s+[^:]+$/i, "")
      .replace(/\s*:\s*.*$/, "")
      .replace(/\s+-\s+.*$/, "")
      .replace(/[,;]\s*$/, "")
      .trim();
  }

  const grouped = new Map<string, BookOption>();

  function parseHighlightTitle(rawTitle: string) {
    const trimmed = rawTitle.trim();
    const separators = [" - ", " > ", " Page "];

    for (const separator of separators) {
      const index = trimmed.indexOf(separator);
      if (index > 0) {
        const title = trimmed.slice(0, index).trim();
        const reference = trimmed.slice(index + separator.length).trim();
        return { title, reference: reference || undefined };
      }
    }

    return { title: trimmed, reference: undefined };
  }

  for (const item of highlights) {
    const { title, reference } = parseHighlightTitle(item.title);
    const canonicalTitle = normalizeBookTitle(title);
    const existing = grouped.get(canonicalTitle);

    if (existing) {
      existing.items.push({ text: item.text, reference });
      continue;
    }

    grouped.set(canonicalTitle, {
      slug: `highlight-${canonicalTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`,
      title: canonicalTitle,
      items: [{ text: item.text, reference }],
    });
  }

  return Array.from(grouped.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export function BookHighlightsDialog({ books, highlights }: Props) {
  const highlightBooks = useMemo<BookOption[]>(
    () => buildHighlightBooks(highlights),
    [highlights],
  );

  const allBooks = useMemo<BookOption[]>(
    () => [...books, ...highlightBooks].sort((a, b) => a.title.localeCompare(b.title)),
    [books, highlightBooks],
  );

  const [open, setOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(allBooks[0]?.slug ?? "");

  useEffect(() => {
    if (!allBooks.some((book) => book.slug === selectedSlug) && allBooks[0]?.slug) {
      setSelectedSlug(allBooks[0].slug);
    }
  }, [allBooks, selectedSlug]);

  const selectedBook = useMemo(
    () => allBooks.find((book) => book.slug === selectedSlug) ?? allBooks[0],
    [allBooks, selectedSlug],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <BookOpenText className="size-4" />
        Book Highlights
      </Button>

      <DialogContent className="w-[min(90vw,56rem)] sm:max-w-none overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Book Highlights</DialogTitle>
          <DialogDescription>
            Pick a book to browse its saved highlights.
          </DialogDescription>
        </DialogHeader>

        {allBooks.length > 0 ? (
          <div className="min-w-0 space-y-4">
            <label className="grid min-w-0 gap-2 text-base">
              <span className="font-medium">Book</span>
              <select
                className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-base outline-none"
                value={selectedBook?.slug ?? ""}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                {allBooks.map((book) => (
                  <option key={book.slug} value={book.slug}>
                    {book.title}
                    {book.author ? ` · ${book.author}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedBook && (
              <div className="min-w-0 space-y-3">
                <div className="text-base text-muted-foreground">
                  {selectedBook.author ? `${selectedBook.author} · ` : ""}
                  {selectedBook.items.length} highlight
                  {selectedBook.items.length === 1 ? "" : "s"}
                </div>

                <div className="max-h-[60vh] min-w-0 space-y-3 overflow-y-auto pr-1">
                  {selectedBook.items.map((item, index) => (
                    <div
                      key={`${selectedBook.slug}-${index}`}
                      className="min-w-0 rounded-lg border border-border p-4 overflow-hidden"
                    >
                      <p className="font-serif whitespace-pre-wrap break-words text-lg leading-relaxed md:text-xl">
                        {item.text}
                      </p>
                      {item.reference && (
                        <p className="mt-2 break-words font-serif text-sm text-muted-foreground">
                          {item.reference}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No highlights found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
