// The Ile logo as vector paths: one source for the website, the app and the
// icon generator (scripts/brand-assets.mjs). Redrawn flat from the founder's
// 3D logo: a green door forms the "i", with navy "le" and a green full stop.
export const BRAND = { navy: "#1B2640", green: "#1EAA32", greenLight: "#35C847" };

const circle = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

// tone: "ink" = navy (white on dark backgrounds), "door" = green, "knob" = white.
export const MARK_PATHS = [
  { tone: "ink", d: "M330 196 A118 118 0 0 1 552 280 Z" }, // the dot of the "i"
  { tone: "door", d: "M298 222 Q285 222 285 235 L285 707 Q285 722 300 718 L476 670 Q488 667 488 655 L488 300 Q488 290 478 287 L300 222 Z" },
  { tone: "ink", d: "M512 312 Q556 324 556 372 L556 590 Q556 630 512 640 Z" }, // door frame
  { tone: "knob", d: circle(432, 482, 22) },
];

export const WORD_PATHS = [
  ...MARK_PATHS,
  { tone: "ink", d: "M622 200 H716 Q740 200 740 224 V681 Q740 705 716 705 H622 Q598 705 598 681 V224 Q598 200 622 200 Z" }, // l
  { tone: "ink", d: "M1108 522 A153 153 0 1 0 1072 620", stroke: 86 }, // e ring
  { tone: "ink", d: "M842 470 H1144 A196 196 0 0 1 1149.65 545 H842 Z" }, // e crossbar
  { tone: "door", d: circle(1248, 642, 80) }, // full stop
];

export const MARK_BOX = { x: 280, y: 186, w: 282, h: 540 };
export const WORD_BOX = { x: 276, y: 182, w: 1060, h: 548 };
export const viewBoxOf = (b) => `${b.x} ${b.y} ${b.w} ${b.h}`;
