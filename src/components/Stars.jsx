"use client";

import { useState } from "react";
import { Star } from "lucide-react";

// Read-only stars, e.g. ★★★★☆ for 4.2.
export function Stars({ value, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden="true"
          className={value >= n - 0.25 ? "fill-gold text-gold" : "text-line-strong"}
        />
      ))}
    </span>
  );
}

// "★ 4.8 · 12 reviews" — or nothing if there are no reviews yet.
export function RatingSummary({ rating, className = "", showAccuracy = false }) {
  if (!rating?.total) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 text-sm ${className}`}>
      <Star size={14} className="fill-gold text-gold" aria-hidden="true" />
      <span className="font-semibold text-ink">{Number(rating.average).toFixed(1)}</span>
      <span className="text-ink-muted">
        · {rating.total} review{rating.total === 1 ? "" : "s"}
        {showAccuracy && rating.accurate_pct !== null && rating.accurate_pct !== undefined && (
          <> · {rating.accurate_pct}% say listings were accurate</>
        )}
      </span>
    </span>
  );
}

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// Tappable 1–5 star picker (radio group under the hood for keyboard users).
export function StarInput({ value, onChange, label = "Your rating" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded p-0.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm" onMouseEnter={() => setHover(n)}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            <span className="sr-only">{n} star{n === 1 ? "" : "s"}</span>
            <Star size={30} aria-hidden="true" className={shown >= n ? "fill-gold text-gold" : "text-line-strong"} />
          </label>
        ))}
        {shown > 0 && <span className="ml-2 text-sm font-semibold text-ink-muted">{LABELS[shown]}</span>}
      </div>
    </fieldset>
  );
}
