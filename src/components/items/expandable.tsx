"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ExpandableProps {
  children: React.ReactNode;
  className?: string;
  collapsedMaxHeight?: number;
}

const DEFAULT_MAX_HEIGHT = 320;

export function Expandable({
  children,
  className,
  collapsedMaxHeight = DEFAULT_MAX_HEIGHT,
}: ExpandableProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > collapsedMaxHeight + 2);
  }, [collapsedMaxHeight]);

  useLayoutEffect(() => {
    measure();
  }, [measure, children]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const handleToggle = () => {
    if (expanded && containerRef.current) {
      const wasAbove =
        containerRef.current.getBoundingClientRect().top < 0;
      const topBefore = containerRef.current.getBoundingClientRect().top;
      setExpanded(false);
      if (wasAbove) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const topAfter = containerRef.current.getBoundingClientRect().top;
          window.scrollBy({ top: topAfter - topBefore, left: 0 });
        });
      }
    } else {
      setExpanded(true);
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <div
        ref={ref}
        style={
          expanded
            ? undefined
            : { maxHeight: collapsedMaxHeight, overflow: "hidden" }
        }
        className={cn(
          !expanded && overflows && "relative",
        )}
      >
        {children}
        {!expanded && overflows && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background"
          />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={handleToggle}
          className="mt-3 font-serif text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
