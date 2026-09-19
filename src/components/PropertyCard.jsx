import { MapPin, BedDouble } from "lucide-react";

// variant "compact" is the fixed-width card used on the homepage; "roomy" fills
// its grid cell and is used on the Browse Listings page.
export default function PropertyCard({
  title, location, price, bedrooms, imageUrl, listingType, variant = "compact",
}) {
  const isSale = listingType === "sale";

  if (variant === "roomy") {
    return (
      <div className="group h-full overflow-hidden rounded-2xl border border-mist bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10">
        <div className="relative aspect-[4/3] overflow-hidden bg-mist">
          <img
            src={imageUrl || "https://placehold.co/600x450"}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/65 to-transparent" />
          {listingType && (
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm ${
                isSale ? "bg-clay" : "bg-palm"
              }`}
            >
              {isSale ? "For Sale" : "For Rent"}
            </span>
          )}
          <p className="absolute bottom-3 left-4 font-display text-xl font-semibold text-white drop-shadow">
            ₦{Number(price).toLocaleString()}
            {!isSale && <span className="text-sm font-medium text-white/85"> /yr</span>}
          </p>
        </div>
        <div className="p-4">
          <h3 className="line-clamp-1 font-display text-lg font-semibold text-ink">{title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/60">
            <MapPin size={14} className="shrink-0" />
            <span className="truncate">{location}</span>
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mist/60 px-2.5 py-1 text-xs font-medium text-ink/70">
            <BedDouble size={13} /> {bedrooms} bedroom{Number(bedrooms) === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border border-mist rounded-lg md:rounded-xl p-1.5 md:p-3 w-full md:w-72 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white">
      <div className="relative">
        <img
          src={imageUrl || "https://placehold.co/400x300"}
          alt={title}
          className="w-full aspect-square md:aspect-[4/3] object-cover rounded-md md:rounded-lg"
        />
        {listingType && (
          <span
            className={`absolute top-1.5 left-1.5 text-[9px] md:text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
              isSale ? "bg-clay" : "bg-palm"
            }`}
          >
            {isSale ? "For Sale" : "For Rent"}
          </span>
        )}
      </div>
      <h3 className="font-display text-[11px] leading-tight md:text-lg font-semibold mt-1.5 md:mt-3 text-ink line-clamp-1">
        {title}
      </h3>
      <p className="flex items-center gap-0.5 md:gap-1 text-ink/60 text-[9px] md:text-sm mt-0.5 md:mt-1">
        <MapPin size={10} className="md:hidden shrink-0" />
        <MapPin size={14} className="hidden md:block shrink-0" />
        <span className="truncate">{location}</span>
      </p>
      <p className="hidden md:flex items-center gap-1 text-ink/60 text-sm">
        <BedDouble size={14} /> {bedrooms} bedroom(s)
      </p>
      <p className="text-palm font-semibold text-[10px] md:text-base mt-1 md:mt-2">
        ₦{Number(price).toLocaleString()}
        {!isSale && "/yr"}
      </p>
    </div>
  );
}