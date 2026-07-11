import { MapPin, BedDouble } from "lucide-react";

export default function PropertyCard({ title, location, price, bedrooms, imageUrl }) {
  return (
    <div className="border border-mist rounded-xl p-3 w-64 shadow-sm hover:shadow-md transition-shadow bg-white">
      <img
        src={imageUrl || "https://placehold.co/400x300"}
        alt={title}
        className="w-full h-40 object-cover rounded-lg"
      />
      <h3 className="font-display text-lg font-semibold mt-3 text-ink">{title}</h3>
      <p className="flex items-center gap-1 text-ink/60 text-sm mt-1">
        <MapPin size={14} /> {location}
      </p>
      <p className="flex items-center gap-1 text-ink/60 text-sm">
        <BedDouble size={14} /> {bedrooms} bedroom(s)
      </p>
      <p className="text-palm font-semibold mt-2">
        ₦{Number(price).toLocaleString()}/year
      </p>
    </div>
  );
}