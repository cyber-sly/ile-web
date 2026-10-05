import Link from "next/link";
import { MapPin, ImageOff } from "lucide-react";
import { ListingTypeBadge, VerifiedBadge, BoostedBadge } from "@/components/ui/Badge";
import SaveButton from "@/components/SaveButton";
import { priceParts, placeLabel, keyFacts, typeLabel, listerLabel, categoryOf } from "@/lib/property";

// One card for every listing grid. The save button sits beside the link, not
// inside it, so there are no nested interactive elements.
export default function PropertyCard({ listing, priority = false }) {
  const cover = listing.image_url || listing.image_urls?.[0];
  const { amount, suffix } = priceParts(listing);
  const facts = keyFacts(listing);
  const category = categoryOf(listing);
  const lister = listing.lister_type && listerLabel(listing.lister_type);

  return (
    <article className="group relative h-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-float)]">
      <Link href={`/listings/${listing.id}`} className="flex h-full flex-col focus-visible:outline-offset-[-2px]">
        <div className="relative aspect-[4/3] overflow-hidden bg-line">
          {cover ? (
            <img
              src={cover}
              alt={listing.title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-muted/50">
              <ImageOff size={36} aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.is_boosted && <BoostedBadge />}
            <ListingTypeBadge type={listing.listing_type} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          {category !== "homes" && listing.property_type && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-ink">
              {typeLabel(listing.property_type)}
            </p>
          )}
          <p className="text-lg font-bold tracking-tight text-ink">
            {amount}
            {suffix && <span className="text-sm font-medium text-ink-muted"> {suffix}</span>}
          </p>
          <h3 className="mt-0.5 line-clamp-1 font-semibold text-ink">{listing.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{placeLabel(listing)}</span>
          </p>
          {facts.length > 0 && (
            <p className="mt-2 text-sm text-ink">{facts.join(" · ")}</p>
          )}
          <div className="min-h-3 flex-1" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-muted [&:not(:has(*))]:hidden">
            {lister && <span>Listed by {lister.toLowerCase()}</span>}
            {listing.is_verified && <VerifiedBadge className="ml-auto" />}
          </div>
        </div>
      </Link>

      <SaveButton
        id={listing.id}
        className="absolute right-3 top-3 h-9 w-9 bg-surface/95 shadow-sm backdrop-blur hover:bg-surface"
      />
    </article>
  );
}
