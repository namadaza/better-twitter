import { randomUUID } from "crypto";
import { Feed } from "@/components/feed";
import { getFeedItemsPage } from "@/app/actions";
import { BottomNav } from "@/components/bottom-nav";
import { loadHighlights } from "@/lib/sources/highlights";
import { loadKoreaderBooks } from "@/lib/sources/koreader-generated";

// Force dynamic rendering to ensure fresh feed data on every page load.
export const dynamic = "force-dynamic";

export default async function Home() {
  const feedSeed = randomUUID();
  const initialItems = await getFeedItemsPage(0, 30, feedSeed);
  const [books, highlights] = await Promise.all([
    loadKoreaderBooks(),
    loadHighlights(),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Feed */}
      <Feed initialItems={initialItems} seed={feedSeed} />

      <BottomNav books={books} highlights={highlights} />

      {/* Mobile responsiveness: Add bottom padding for bottom nav */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}
