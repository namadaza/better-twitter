"use client";

import { ReadingHighlight } from "@/lib/types";
import { getRandomHighlights } from "@/app/actions";
import { useState, useEffect, useCallback } from "react";

interface HighlightsFeedProps {
  initialHighlights: ReadingHighlight[];
}

export function HighlightsFeed({ initialHighlights }: HighlightsFeedProps) {
  const [highlights, setHighlights] =
    useState<ReadingHighlight[]>(initialHighlights);
  const [loading, setLoading] = useState(false);

  const loadMoreHighlights = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const newHighlights = await getRandomHighlights(30);
      setHighlights((prev) => [...prev, ...newHighlights]);
    } catch (error) {
      console.error("Error loading more highlights:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        loadMoreHighlights();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMoreHighlights]);

  const filteredHighlights = highlights.filter(
    (highlight) =>
      highlight?.title &&
      highlight?.text &&
      highlight.title.trim() !== "" &&
      highlight.text.trim() !== ""
  );

  return (
    <div className="max-w-2xl mx-auto pt-8 pb-24">
      {filteredHighlights.map((highlight, index) => (
        <article key={`${highlight.title}-${index}`} className="px-4 py-8">
          {/* Header Preview (Title) */}
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-6 leading-snug">
            {highlight.title.length > 30
              ? highlight.title.substring(0, 30) + "..."
              : highlight.title}
          </h2>

          {/* Highlight Text */}
          <div className="font-serif text-base md:text-lg text-foreground leading-relaxed mb-6 whitespace-pre-wrap">
            {highlight.text}
          </div>

          {/* Full Source */}
          <div className="font-serif text-sm text-muted-foreground italic">
            — {highlight.title}
          </div>

          {/* Divider */}
          {index < filteredHighlights.length - 1 && (
            <div className="mt-8 border-t border-border/50"></div>
          )}
        </article>
      ))}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      )}
    </div>
  );
}
