import { ThemeToggle } from "@/components/theme-toggle";
import { HighlightsFeed } from "@/components/highlights-feed";
import { getRandomHighlights } from "@/app/actions";

// Force dynamic rendering to ensure fresh randomization on every page load
export const dynamic = "force-dynamic";

export default async function Home() {
  const initialHighlights = await getRandomHighlights(30);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Feed */}
      <HighlightsFeed initialHighlights={initialHighlights} />

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground"
            >
              <path d="M18 5h4" />
              <path d="M20 3v4" />
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
            </svg>
            <h1 className="font-serif text-base md:text-sm font-semibold">
              Reading Highlights
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile responsiveness: Add bottom padding for bottom nav */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}
