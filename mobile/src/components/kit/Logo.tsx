import Svg, { Path } from "react-native-svg";
import { BRAND, WORD_BOX, WORD_PATHS, viewBoxOf } from "@shared/brand.js";

// The Ile wordmark, same geometry as the website (shared/brand.js).
// `size` is the height; on dark backgrounds the navy turns white.
export default function Logo({ onDark = false, size = 26 }: { onDark?: boolean; size?: number }) {
  const colour: Record<string, string> = { ink: onDark ? "#FFFFFF" : BRAND.navy, door: BRAND.green, knob: "#FFFFFF" };
  return (
    <Svg
      width={(size * WORD_BOX.w) / WORD_BOX.h}
      height={size}
      viewBox={viewBoxOf(WORD_BOX)}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ile"
    >
      {(WORD_PATHS as { tone: string; d: string; stroke?: number }[]).map((p, i) =>
        p.stroke ? (
          <Path key={i} d={p.d} fill="none" stroke={colour[p.tone]} strokeWidth={p.stroke} />
        ) : (
          <Path key={i} d={p.d} fill={colour[p.tone]} />
        )
      )}
    </Svg>
  );
}
