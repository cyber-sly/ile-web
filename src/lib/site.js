// Public base URL, used for share previews, the sitemap and structured data.
// Set NEXT_PUBLIC_SITE_URL once the custom domain is live (e.g. https://ile.ng);
// until then Vercel's own URL is used.
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Ile";
export const DEFAULT_OG_IMAGE = "/videos/hero-poster.jpg";
