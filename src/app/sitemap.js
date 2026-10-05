import { supabaseServer } from "@/lib/supabaseServer";
import { SITE_URL } from "@/lib/site";
import { freshCutoff } from "@/lib/property";

// Rebuilt at most once an hour.
export const revalidate = 3600;

// Every available listing, plus the category pages for each state that has
// listings, so Google can find "Homes for rent in Lagos" style pages.
export default async function sitemap() {
  const { data: listings } = await supabaseServer
    .from("listings")
    .select("id, created_at, state, category, listing_type, landlord_id")
    .eq("status", "active")
    .gte("last_confirmed_at", freshCutoff())
    .order("created_at", { ascending: false })
    .limit(10000);

  const now = new Date();
  const pages = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/listings`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/listings?tab=sale`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/listings?tab=land`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/listings?tab=commercial`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/listings/new`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const tabOf = (l) => (l.category === "homes" ? (l.listing_type === "sale" ? "sale" : null) : l.category);
  const statePages = new Set();
  for (const l of listings || []) {
    if (!l.state) continue;
    const tab = tabOf(l);
    const params = new URLSearchParams(tab ? { tab, state: l.state } : { state: l.state });
    statePages.add(`${SITE_URL}/listings?${params}`);
  }

  return [
    ...pages,
    ...[...statePages].map((url) => ({ url, changeFrequency: "daily", priority: 0.7 })),
    ...[...new Set((listings || []).map((l) => l.landlord_id))].map((id) => ({
      url: `${SITE_URL}/u/${id}`,
      changeFrequency: "weekly",
      priority: 0.4,
    })),
    ...(listings || []).map((l) => ({
      url: `${SITE_URL}/listings/${l.id}`,
      lastModified: new Date(l.created_at),
      changeFrequency: "weekly",
      priority: 0.6,
    })),
  ];
}
