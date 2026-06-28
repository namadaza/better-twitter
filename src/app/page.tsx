import { randomUUID } from "crypto";
import { getFeedItemsPage } from "@/app/actions";
import { HomeFeed } from "@/components/home-feed";
import { getUserSession } from "@/lib/db/user";
import { loadHighlights } from "@/lib/sources/highlights";
import { loadKoreaderBooks } from "@/lib/sources/koreader-generated";

// Force dynamic rendering to ensure fresh feed data on every page load.
export const dynamic = "force-dynamic";

export default async function Home() {
  const feedSeed = randomUUID();
  const initialItems = await getFeedItemsPage(0, 30, feedSeed);
  const [books, highlights, initialSession] = await Promise.all([
    loadKoreaderBooks(),
    loadHighlights(),
    getUserSession(),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeFeed
        initialItems={initialItems}
        seed={feedSeed}
        books={books}
        highlights={highlights}
        initialSession={initialSession}
      />

      {/* Mobile responsiveness: Add bottom padding for bottom nav */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}
