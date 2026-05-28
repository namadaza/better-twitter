import { ExternalLink } from "lucide-react";
import { FEED_ITEM_BODY_TEXT_CLASSNAME } from "./styles";

export type Artwork = {
  id?: string;
  title?: string;
  artist?: string;
  year?: number | string | null;
  license_name?: string;
  license_url?: string;
  thumbnail_url?: string;
  full_image_url?: string | null;
  source_file_page?: string;
  genres?: string[];
  // When true the feed should skip rendering this artwork (keeps it in the dataset)
  doNotRender?: boolean;
  // Raw external metadata from the source (some sources provide a `completitionYear`)
  // Use `unknown` for arbitrary metadata instead of `any` to satisfy lint rules.
  raw_extmetadata?: {
    completitionYear?: number | string | null;
    [key: string]: unknown;
  };
};

export function ArtworkItem({ art }: { art: Artwork }) {
  // Skip rendering items explicitly marked to not render in the feed.
  if (art.doNotRender) return null;
  // Use the title from the manifest as the main heading to avoid rendering raw metadata markup.
  const title = art.title || "Artwork";
  // Prefer the top-level year when available; fall back to the source's completion year.
  // This allows either `year` or `raw_extmetadata.completitionYear` to be used.
  const completionYear = art.year ?? art.raw_extmetadata?.completitionYear;
  // Format artist names as "Last, First" when possible. If the artist
  // already contains a comma or is a single word, leave it unchanged.
  const formatArtist = (name?: string) => {
    if (!name) return undefined;
    const trimmed = name.trim();
    if (trimmed.includes(",")) return trimmed;
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts.pop();
    const first = parts.join(" ");
    return `${last}, ${first}`;
  };

  const formattedArtist = formatArtist(art.artist);
  const subtitle = [formattedArtist, completionYear].filter(Boolean).join(" · ");

  return (
    <article className="px-4 py-8">
      <div className="mb-4 font-serif text-sm uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>

      <div className="mb-5">
        <a href={art.source_file_page} target="_blank" rel="noreferrer">
          <img
            src={art.thumbnail_url}
            alt={title}
            className="w-full max-h-[720px] object-contain rounded"
          />
        </a>
      </div>

      {subtitle && (
        <div className={`mb-3 ${FEED_ITEM_BODY_TEXT_CLASSNAME}`}>
          {subtitle}
        </div>
      )}

      {art.genres && art.genres.length > 0 && (
        <div className="mb-3 text-sm text-muted-foreground capitalize">
          {art.genres.join(", ")}
        </div>
      )}

      <div className="mb-3 text-sm text-muted-foreground">
        {art.license_name}
        {art.license_url ? (
          <a
            href={art.license_url}
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-flex items-center gap-1 hover:opacity-70"
          >
            License <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          </a>
        ) : null}
      </div>
    </article>
  );
}
