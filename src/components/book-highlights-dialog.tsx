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
import type { KoreaderBook } from "@/lib/sources/koreader-generated";

type Props = {
  books: KoreaderBook[];
};

export function BookHighlightsDialog({ books }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(books[0]?.slug ?? "");

  useEffect(() => {
    if (!selectedSlug && books[0]?.slug) {
      setSelectedSlug(books[0].slug);
    }
  }, [books, selectedSlug]);

  const selectedBook = useMemo(
    () => books.find((book) => book.slug === selectedSlug) ?? books[0],
    [books, selectedSlug],
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

        {books.length > 0 ? (
          <div className="min-w-0 space-y-4">
            <label className="grid min-w-0 gap-2 text-base">
              <span className="font-medium">Book</span>
              <select
                className="h-11 w-full min-w-0 max-w-full rounded-md border border-border bg-background px-3 text-base outline-none"
                value={selectedBook?.slug ?? ""}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                {books.map((book) => (
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
          <p className="text-sm text-muted-foreground">
            No generated books found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
