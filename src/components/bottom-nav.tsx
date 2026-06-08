"use client";

import { BookOpenText } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { BookHighlightsDialog } from "@/components/book-highlights-dialog";
import type { KoreaderBook } from "@/lib/sources/koreader-generated";

type Props = {
  books: KoreaderBook[];
};

export function BottomNav({ books }: Props) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="rounded-full border border-border p-2 text-foreground">
          <BookOpenText className="size-4" />
        </div>
        <div className="flex items-center gap-2">
          <BookHighlightsDialog books={books} />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
