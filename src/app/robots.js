import { SITE_URL } from "@/lib/site";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-user pages have nothing for search engines.
      disallow: [
        "/dashboard",
        "/account",
        "/messages",
        "/my-bookings",
        "/saved",
        "/admin",
        "/listings/*/edit",
        "/listings/*/viewings",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
