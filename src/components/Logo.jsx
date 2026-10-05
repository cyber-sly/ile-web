import Link from "next/link";

export default function Logo({ onDark = false, className = "" }) {
  return (
    <Link
      href="/"
      aria-label="Ile home"
      className={`font-serif text-[26px] font-semibold leading-none tracking-tight ${
        onDark ? "text-white" : "text-ink"
      } ${className}`}
    >
      Ile<span className={onDark ? "text-gold" : "text-palm"}>.</span>
    </Link>
  );
}
