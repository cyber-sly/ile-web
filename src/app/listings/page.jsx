import ListingsBrowser from "@/components/ListingsBrowser";
import { SEARCH_TABS } from "@/lib/search";
import { stateLabel } from "@/lib/nigeria";

// Search result titles like "Homes for rent in Lagos · Ile", so shared search
// links and Google results describe what's on the page.
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const one = (v) => (Array.isArray(v) ? v[0] : v) || "";
  const legacyType = ["rent", "sale"].includes(one(sp.type)) ? one(sp.type) : "";
  const tabValue = one(sp.tab) || legacyType || "rent";
  const tab = SEARCH_TABS.find((t) => t.value === tabValue) || SEARCH_TABS[0];
  const state = one(sp.state);
  const lga = one(sp.lga);
  const q = one(sp.q) || one(sp.location);

  const where = lga ? `${lga}, ${stateLabel(state)}` : state ? stateLabel(state) : "Nigeria";
  const title = q && !state ? `${tab.heading} matching “${q}”` : `${tab.heading} in ${where}`;
  const description = `Browse ${tab.heading.toLowerCase()} in ${where}. Prices shown upfront, free viewings, no inspection fees.`;

  // Index the main category and location pages; keep filtered variants
  // (price, beds, free-text) out of Google to avoid thousands of near-duplicates.
  const filtered = ["q", "location", "min", "max", "beds", "ptype", "purpose", "title", "sort"].some((k) => one(sp[k]));
  const canonical = `/listings${new URLSearchParams(
    Object.entries({ tab: tab.value === "rent" ? "" : tab.value, state, lga }).filter(([, v]) => v)
  ).toString().replace(/^(.)/, "?$1")}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical },
  };
}

export default function ListingsPage() {
  return <ListingsBrowser />;
}
