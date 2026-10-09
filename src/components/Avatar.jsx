// Round profile photo, or the person's initial on brand green when there's
// no photo yet.
const SIZES = { xs: "h-7 w-7 text-xs", sm: "h-9 w-9 text-sm", md: "h-12 w-12 text-lg", lg: "h-20 w-20 text-3xl" };

export default function Avatar({ src, name, size = "sm", className = "" }) {
  const initial = (name || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-palm font-serif font-semibold text-white ${SIZES[size]} ${className}`}
      aria-hidden={src ? undefined : "true"}
    >
      {src ? <img src={src} alt={name ? `${name}'s photo` : ""} loading="lazy" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}
