import { categoryOf, freshCutoff, isAvailable, isExpired } from "@shared/property.js";
import type { ListingRow } from "@/components/PropertyCard";

export function listingPhotos(listing: ListingRow): string[] {
  if (listing.image_urls?.length) return listing.image_urls;
  return listing.image_url ? [listing.image_url] : [];
}

// What the listing screen should show.
export function listingState(listing: ListingRow | null): "missing" | "unavailable" | "available" {
  if (!listing) return "missing";
  return !isAvailable(listing) || isExpired(listing) ? "unavailable" : "available";
}

// Shared links open the website (app links wait for the custom domain).
export function listingUrl(id: string): string {
  return `${process.env.EXPO_PUBLIC_SITE_URL}/listings/${id}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export async function fetchListing(client: Client, id: string): Promise<ListingRow | null> {
  const { data, error } = await client.from("listings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Same rules as the website's "Similar" row (ListingDetail.jsx).
export async function fetchSimilar(client: Client, listing: ListingRow): Promise<ListingRow[]> {
  let query = client
    .from("listings")
    .select("*")
    .eq("status", "active")
    .gte("last_confirmed_at", freshCutoff())
    .eq("category", categoryOf(listing))
    .eq("listing_type", listing.listing_type || "rent")
    .neq("id", listing.id);
  if (listing.state) query = query.eq("state", listing.state);
  const { data } = await query.order("created_at", { ascending: false }).limit(4);
  return data || [];
}
