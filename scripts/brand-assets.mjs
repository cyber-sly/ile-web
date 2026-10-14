// Builds every app icon, splash and favicon from brand/shapes.mjs.
//   node scripts/brand-assets.mjs
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import { markShapes, wordShapes, MARK_BOX, WORD_BOX } from "../brand/shapes.mjs";

const WHITE = "#FFFFFF";

// Frame shapes from `box` inside a size x size canvas; `fill` = share of the canvas height the art takes.
function canvas(size, shapes, box, { fill = 0.6, bg = null, width = size, height = size } = {}) {
  const scale = Math.min((height * fill) / box.h, (width * 0.86) / box.w);
  const tx = (width - box.w * scale) / 2 - box.x * scale;
  const ty = (height - box.h * scale) / 2 - box.y * scale;
  const back = bg ? `<rect width="${width}" height="${height}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${back}<g transform="translate(${tx} ${ty}) scale(${scale})">${shapes}</g></svg>`;
}

async function png(svg, out) {
  mkdirSync(out.replace(/[\/][^\/]+$/, ""), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("wrote", out);
}

// ICO that wraps PNG images (supported by every current browser).
async function ico(sizes, svgFor, out) {
  const pngs = await Promise.all(sizes.map((s) => sharp(Buffer.from(svgFor(s))).png().toBuffer()));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(s >= 256 ? 0 : s, e);
    header.writeUInt8(s >= 256 ? 0 : s, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[i].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  writeFileSync(out, Buffer.concat([header, ...pngs]));
  console.log("wrote", out);
}

const M = "mobile/assets/images";
const mark = markShapes("color");

// Mobile: store icon (iOS uses it as-is, no transparency), Android adaptive layers, splash.
await png(canvas(1024, mark, MARK_BOX, { fill: 0.62, bg: WHITE }), `${M}/icon.png`);
// Adaptive foreground must sit inside the 66/108 safe circle.
await png(canvas(1024, mark, MARK_BOX, { fill: 0.5 }), `${M}/android-icon-foreground.png`);
await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${WHITE}"/></svg>`, `${M}/android-icon-background.png`);
await png(canvas(1024, markShapes("mono"), MARK_BOX, { fill: 0.5 }), `${M}/android-icon-monochrome.png`);
await png(canvas(1024, wordShapes("color"), WORD_BOX, { width: 1024, height: 560, fill: 0.9 }), `${M}/splash-icon.png`);
await png(canvas(48, mark, MARK_BOX, { fill: 0.86, bg: WHITE }), `${M}/favicon.png`);

// Web: favicon set, home-screen icons, and a logo file for emails and press.
await ico([16, 32, 48], (s) => canvas(s, mark, MARK_BOX, { fill: 0.92 }), "src/app/favicon.ico");
await png(canvas(512, mark, MARK_BOX, { fill: 0.8 }), "src/app/icon.png");
await png(canvas(180, mark, MARK_BOX, { fill: 0.66, bg: WHITE }), "src/app/apple-icon.png");
await png(canvas(512, mark, MARK_BOX, { fill: 0.62, bg: WHITE }), "public/icons/icon-512.png");
await png(canvas(192, mark, MARK_BOX, { fill: 0.62, bg: WHITE }), "public/icons/icon-192.png");
await png(canvas(512, mark, MARK_BOX, { fill: 0.46, bg: WHITE }), "public/icons/icon-maskable-512.png");
await png(canvas(1200, wordShapes("color"), WORD_BOX, { width: 1200, height: 640, fill: 0.7, bg: WHITE }), "public/brand/ile-logo.png");
writeFileSync("public/brand/ile-logo.svg", canvas(1060, wordShapes("color"), WORD_BOX, { width: 1060, height: 548, fill: 1 }));
console.log("done");
