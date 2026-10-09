import { useEffect } from "react";
import { Image } from "expo-image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useSavedIds } from "./saved";
import { listingPhotos } from "./listing";
import type { ListingRow } from "@/components/PropertyCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// The Saved tab's data; photos are kept on the phone so it works offline.
export function useSavedListings() {
  const ids = useSavedIds();
  const query = useQuery({
    queryKey: ["saved-listings", ids],
    queryFn: () => fetchSavedListings(supabase, ids),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const urls = (query.data || []).flatMap((l) => listingPhotos(l).slice(0, 3));
    if (urls.length) Image.prefetch(urls, { cachePolicy: "disk" }).catch(() => {});
  }, [query.data]);

  // Un-hearting removes the card straight away, before any refetch.
  const listings = (query.data || []).filter((l) => ids.includes(String(l.id)));
  return { ...query, ids, listings };
}
