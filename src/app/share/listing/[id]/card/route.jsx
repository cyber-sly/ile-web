/* eslint-disable @next/next/no-img-element -- ImageResponse only understands plain <img> */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";
import { getListing } from "@/lib/supabaseServer";
import { SITE_URL } from "@/lib/site";
import { isModerated, keyFacts, placeLabel, priceParts } from "@/lib/property";
import { normalizeCode, shareUrl } from "@shared/referrals.js";
import { BRAND, WORD_PATHS, WORD_BOX, viewBoxOf } from "@shared/brand.js";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FONTS = join(process.cwd(), "src/app/share/fonts");

// Website colours (globals.css).
const C = { cream: "#F6F1E7", surface: "#FFFDF8", ink: "#1B2640", muted: "#5A6275", palm: "#1F7A2C", gold: "#C99A2E", line: "#E8E0D0" };

// The Ile wordmark as an SVG data URL (ImageResponse draws it via <img>).
const WORDMARK_HEIGHT = 96;
const WORDMARK = (() => {
  const colour = { ink: BRAND.navy, door: BRAND.green, knob: "#fff" };
  const paths = WORD_PATHS.map((p) =>
    p.stroke
      ? `<path d="${p.d}" fill="none" stroke="${colour[p.tone]}" stroke-width="${p.stroke}"/>`
      : `<path d="${p.d}" fill="${colour[p.tone]}"/>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxOf(WORD_BOX)}">${paths}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
})();

// Listing photos are WebP, which ImageResponse can't draw: fetch, crop to
// the card's photo area and hand it over as a JPEG. No photo -> null.
async function photoDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(1080, 1150, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

let fontsPromise;
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(FONTS, "Fraunces_600SemiBold.ttf")),
    readFile(join(FONTS, "Inter_400Regular.ttf")),
    readFile(join(FONTS, "Inter_700Bold.ttf")),
  ]).then(([serif, regular, bold]) => [
    { name: "Fraunces", data: serif, weight: 600, style: "normal" },
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ]);
  return fontsPromise;
}

// A 1080×1920 picture of a listing for WhatsApp Status and Instagram Stories:
// photo, price, place, key facts, logo, and a QR code of the tracked link.
export async function GET(request, { params }) {
  const { id } = await params;
  const listing = UUID.test(id) ? await getListing(id) : null;
  if (!listing || listing.status !== "active" || isModerated(listing)) {
    return new Response("Not found", { status: 404 });
  }

  const code = normalizeCode(new URL(request.url).searchParams.get("ref"));
  const link = shareUrl({ site: SITE_URL, listingId: listing.id, code });
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: C.ink, light: C.surface } });
  const { amount, suffix } = priceParts(listing);
  const facts = keyFacts(listing).join(" · ");
  const photo = await photoDataUrl(listing.image_url || listing.image_urls?.[0]);
  const typeLabel = listing.listing_type === "sale" ? "For sale" : "For rent";

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1920, display: "flex", flexDirection: "column", background: C.cream, fontFamily: "Inter" }}>
        <div style={{ position: "relative", width: 1080, height: 1150, display: "flex", background: C.palm }}>
          {photo ? <img src={photo} alt="" width={1080} height={1150} style={{ objectFit: "cover" }} /> : null}
          <div
            style={{
              position: "absolute",
              top: 56,
              left: 56,
              display: "flex",
              padding: "14px 30px",
              borderRadius: 999,
              background: listing.listing_type === "sale" ? C.ink : C.palm,
              border: "3px solid rgba(255,255,255,0.85)",
              color: "white",
              fontSize: 38,
              fontWeight: 700,
            }}
          >
            {typeLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "56px 64px 0", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", color: C.ink }}>
            <span style={{ fontSize: 88, fontWeight: 700 }}>{amount}</span>
            {suffix ? <span style={{ fontSize: 44, color: C.muted, marginLeft: 12 }}>{suffix}</span> : null}
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 60, lineHeight: 1.15, color: C.ink, marginTop: 16 }}>
            {listing.title.length > 70 ? `${listing.title.slice(0, 68)}…` : listing.title}
          </div>
          <div style={{ display: "flex", fontSize: 40, color: C.muted, marginTop: 20 }}>{placeLabel(listing)}</div>
          {facts ? <div style={{ display: "flex", fontSize: 40, color: C.ink, marginTop: 14 }}>{facts}</div> : null}

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto", marginBottom: 72 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <img
                src={WORDMARK}
                alt="Ile"
                height={WORDMARK_HEIGHT}
                width={Math.round((WORDMARK_HEIGHT * WORD_BOX.w) / WORD_BOX.h)}
              />
              <div style={{ display: "flex", fontSize: 34, color: C.muted, marginTop: 4 }}>Free viewings. No inspection fees.</div>
              {code ? (
                <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: C.palm, marginTop: 18 }}>Use code {code} on Ile</div>
              ) : null}
            </div>
            <img src={qr} alt="" width={260} height={260} style={{ borderRadius: 16, border: `4px solid ${C.line}` }} />
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: await loadFonts(),
      headers: { "Cache-Control": "public, max-age=86400" },
    }
  );
}
