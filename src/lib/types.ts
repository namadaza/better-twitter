export type FeedItem =
  | {
      type: "highlight";
      id: string;
      title: string;
      text: string;
    }
  | {
      type: "poem";
      id: string;
      title: string;
      author: string;
      book: string;
      body: string;
    }
  | {
      type: "aphorism";
      id: string;
      text: string;
      author: string;
      book: string;
    }
  | {
      type: "substack";
      id: string;
      title: string;
      url: string;
      publication: string;
      author?: string;
      excerpt?: string;
      publishedAt?: string;
    };

export type Theme = "light" | "dark" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}
