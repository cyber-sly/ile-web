import Link from "next/link";
import { BRAND, WORD_PATHS, WORD_BOX, viewBoxOf } from "@shared/brand.js";

// The Ile wordmark (geometry in shared/brand.js). On dark backgrounds the navy turns white.
export function Wordmark({ onDark = false, height = 28, className = "" }) {
  const colour = { ink: onDark ? "#fff" : BRAND.navy, door: BRAND.green, knob: "#fff" };
  return (
    <svg
      viewBox={viewBoxOf(WORD_BOX)}
      height={height}
      width={(height * WORD_BOX.w) / WORD_BOX.h}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {WORD_PATHS.map((p, i) =>
        p.stroke ? (
          <path key={i} d={p.d} fill="none" stroke={colour[p.tone]} strokeWidth={p.stroke} />
        ) : (
          <path key={i} d={p.d} fill={colour[p.tone]} />
        )
      )}
    </svg>
  );
}

export default function Logo({ onDark = false, className = "", height = 28 }) {
  return (
    <Link href="/" aria-label="Ile home" className={`inline-flex shrink-0 items-center ${className}`}>
      <Wordmark onDark={onDark} height={height} />
    </Link>
  );
}
