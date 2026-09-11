import { MapPin, BedDouble } from "lucide-react";

export default function PropertyCard({ title, location, price, bedrooms, imageUrl, listingType }) {
  const isSale = listingType === "sale";

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