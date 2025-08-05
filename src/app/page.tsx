import { ThemeToggle } from "@/components/theme-toggle";
import { getHighlights } from "@/app/actions";

export default async function Home() {
  const highlights = await getHighlights();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Feed */}
      <div className="max-w-2xl mx-auto pt-4">
        {highlights.map((highlight, index) => (
          <article
            key={index}
            className="border-b border-border px-4 py-3 tweet-hover cursor-pointer"
          >
            <div className="flex space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <img
                  src={`https://avatar.vercel.sh/${
                    highlight.title.length > 30
                      ? highlight.title.substring(0, 30)
                      : highlight.title
                  }`}
                  alt={`Avatar for ${highlight.title}`}
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>

              {/* Tweet Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-bold text-foreground truncate max-w-[200px] hover:underline cursor-pointer">
                    {highlight.title.length > 30
                      ? highlight.title.substring(0, 30) + "..."
                      : highlight.title}
                  </span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <span className="text-muted-foreground text-sm hover:underline cursor-pointer">
                    {Math.floor(Math.random() * 12) + 1}h
                  </span>
                </div>

                {/* Tweet Text */}
                <div className="text-foreground text-[15px] leading-5 mb-3 whitespace-pre-wrap">
                  {highlight.text}
                </div>

                {/* Full title name */}
                <div className="text-muted-foreground text-sm hover:underline cursor-pointer">
                  {highlight.title}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between max-w-md mt-3">
                  {/* Reply */}
                  <div className="flex items-center space-x-2 text-muted-foreground hover:text-blue-400 transition-colors group action-button">
                    <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm group-hover:text-blue-400 transition-colors">
                      {Math.floor(Math.random() * 50) + 1}
                    </span>
                  </div>

                  {/* Retweet */}
                  <div className="flex items-center space-x-2 text-muted-foreground hover:text-green-400 transition-colors group action-button">
                    <div className="p-2 rounded-full group-hover:bg-green-400/10 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    </div>
                    <span className="text-sm group-hover:text-green-400 transition-colors">
                      {Math.floor(Math.random() * 100) + 5}
                    </span>
                  </div>

                  {/* Like */}
                  <div className="flex items-center space-x-2 text-muted-foreground hover:text-red-500 transition-colors group action-button">
                    <div className="p-2 rounded-full group-hover:bg-red-500/10 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm group-hover:text-red-500 transition-colors">
                      {Math.floor(Math.random() * 200) + 10}
                    </span>
                  </div>

                  {/* Share */}
                  <div className="text-muted-foreground hover:text-blue-400 transition-colors group action-button">
                    <div className="p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-2xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-1.5">
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
            <h1 className="text-lg font-bold">Better Twitter</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile responsiveness: Add bottom padding for bottom nav */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}
