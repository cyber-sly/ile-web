import { useEffect } from "react";
import { Image } from "expo-image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useSavedIds } from "./saved";
import { listingPhotos } from "./listing";
import { cachedListings, queryClient, seedListings } from "./queryClient";
import type { ListingRow } from "@/components/PropertyCard";

type Client = any;

// Saved listings that are still available, in saved order (newest first).
// Let, sold or removed homes drop off, like the website's Saved page.
export async function fetchSavedListings(client: Client, ids: string[]): Promise<ListingRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client.from("listings").select("*").in("id", ids).eq("status", "active");
  if (error) throw new Error(error.message);
  const byId = new Map<string, ListingRow>((data || []).map((l: ListingRow) => [String(l.id), l]));
  return ids.map((id) => byId.get(id)).filter((l): l is ListingRow => Boolean(l));
}

// The Saved tab's data. Each saved listing is also stored as its own
// ["listing", id] entry with its photos on the phone, so saved homes open
// offline; when the list can't be fetched, those entries are shown instead.
export function useSavedListings() {
  const ids = useSavedIds();
  const query = useQuery({
    queryKey: ["saved-listings", ids],
    queryFn: async () => {
      const rows = await fetchSavedListings(supabase, ids);
      seedListings(queryClient, rows);
      return rows;
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const urls = (query.data || []).flatMap((l) => listingPhotos(l).slice(0, 6));
    if (urls.length) Image.prefetch(urls, { cachePolicy: "disk" }).catch(() => {});
  }, [query.data]);

  const fresh = query.isSuccess && !query.isPlaceholderData;
  let listings: ListingRow[];
  if (fresh) {
    listings = query.data;
  } else {
    const byId = new Map(cachedListings(queryClient, ids).map((l) => [String(l.id), l]));
    for (const l of query.data || []) byId.set(String(l.id), l);
    listings = ids.map((id) => byId.get(id)).filter((l): l is ListingRow => Boolean(l));
  }
  // Un-hearting removes the card straight away, before any refetch.
  listings = listings.filter((l) => ids.includes(String(l.id)));
  return { ...query, ids, listings };
}
