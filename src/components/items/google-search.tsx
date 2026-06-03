import { ExternalLink } from "lucide-react";

export function googleSearchUrl(text: string): string | null {
  const query = text.trim();
  if (!query) return null;
  return `https://www.google.com/search?q=${encodeURIComponent(
    `give more context to this ${query}`,
  )}&udm=50`;
}

export function GoogleSearchLink({ text }: { text: string }) {
  const url = googleSearchUrl(text);
  if (!url) return null;

  return (
    <a
      className="inline-flex items-center gap-1 hover:opacity-70"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      Learn More <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
    </a>
  );
}
