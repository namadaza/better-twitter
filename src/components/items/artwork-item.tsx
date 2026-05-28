import { ExternalLink } from "lucide-react";
import { FEED_ITEM_BODY_TEXT_CLASSNAME } from "./styles";

type Artwork = {
  id?: string;
  title?: string;
  artist?: string;
  year?: string;
  license_name?: string;
  license_url?: string;
  thumbnail_url?: string;
  full_image_url?: string | null;
  source_file_page?: string;
  genres?: string[];
};

export function ArtworkItem({ art }: { art: Artwork }) {
  // Use the title from the manifest as the main heading to avoid rendering raw metadata markup.
  const title = art.title || "Artwork";
  const subtitle = [art.artist, art.year].filter(Boolean).join(" · ");

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
