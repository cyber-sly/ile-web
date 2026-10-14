// SVG markup for the icon generator, built from shared/brand.js.
import { BRAND, MARK_PATHS, WORD_PATHS } from "../shared/brand.js";
export { MARK_BOX, WORD_BOX } from "../shared/brand.js";

const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRAND.greenLight}"/><stop offset="1" stop-color="${BRAND.green}"/></linearGradient></defs>`;

// tone: "color" (navy + green), "white" (for dark backgrounds), "mono" (one colour, knob cut out)
function draw(paths, tone) {
  const colour = {
    color: { ink: BRAND.navy, door: "url(#g)", knob: "#fff" },
    white: { ink: "#fff", door: "url(#g)", knob: "#fff" },
    mono: { ink: "#000", door: "#000", knob: "#000" },
  }[tone];
  const shapes = paths
    .filter((p) => !(tone === "mono" && p.tone === "knob"))
    .map((p) =>
      p.stroke
        ? `<path d="${p.d}" fill="none" stroke="${colour[p.tone]}" stroke-width="${p.stroke}"/>`
        : `<path d="${p.d}" fill="${colour[p.tone]}"/>`
    )
    .join("");
  if (tone !== "mono") return defs + shapes;
  // Knob becomes a hole so the themed Android icon still shows it.
  const knob = paths.find((p) => p.tone === "knob");
  return `<defs><mask id="m"><rect x="0" y="0" width="2000" height="2000" fill="#fff"/><path d="${knob.d}" fill="#000"/></mask></defs><g mask="url(#m)">${shapes}</g>`;
}

export const markShapes = (tone = "color") => draw(MARK_PATHS, tone);
export const wordShapes = (tone = "color") => draw(WORD_PATHS, tone);
