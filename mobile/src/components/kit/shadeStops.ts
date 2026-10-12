export type ShadeStop = { offset: string; color: string; opacity: number };

// "rgba(15,28,21,0.3)" / "transparent" -> SVG stop colour and opacity.
function split(color: string): { color: string; opacity: number } {
  if (color === "transparent") return { color: "rgb(0,0,0)", opacity: 0 };
  const m = color.replace(/\s/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/);
  if (!m) return { color, opacity: 1 };
  return { color: `rgb(${m[1]},${m[2]},${m[3]})`, opacity: m[4] === undefined ? 1 : Number(m[4]) };
}

// Gradient stops, top to bottom; evenly spaced unless locations are given.
export function shadeStops(colors: string[], locations?: number[]): ShadeStop[] {
  return colors.map((c, i) => {
    const at = locations?.[i] ?? (colors.length > 1 ? i / (colors.length - 1) : 0);
    return { offset: `${Math.round(at * 100)}%`, ...split(c) };
  });
}
