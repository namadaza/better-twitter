export type FeedItem =
  | {
      type: "highlight";
      id: string;
      title: string;
      text: string;
    }
  | {
      type: "rss";
      id: string;
      title: string;
      url: string;
      publication: string;
      author?: string;
      excerpt?: string;
      publishedAt?: string;
    }
  | {
      type: "book";
      id: string;
      format: "poem" | "prose";
      body: string;
      title?: string;
      author?: string;
      book: string;
      source?: string;
      reference?: string;
      url?: string;
      secondaryText?: string;
    };

export type Theme = "light" | "dark" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}
