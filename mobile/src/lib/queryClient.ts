import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

// Query keys used across the app:
//   ["search", filters]        infinite search results
//   ["listing", id]            one listing (also seeded from the Saved tab)
//   ["similar", id]            similar listings on the listing screen
//   ["saved-listings", ids]    the Saved tab
//   ["lister", userId]         lister name, photo, rating, reply time

export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// What is kept across restarts: listings that are saved or recently viewed,
// and the current search's first page. Nothing else, so the cache stays
// small (Android limits AsyncStorage size). Kept current by saved.ts,
// recent.ts and filters.ts.
type Scope = { listingIds: Set<string>; searchKey: string };
let savedIds: string[] = [];
let recentIds: string[] = [];
let scope: Scope = { listingIds: new Set(), searchKey: "" };

export function setPersistScope(changes: { savedIds?: string[]; recentIds?: string[]; filters?: object }) {
  if (changes.savedIds) savedIds = changes.savedIds;
  if (changes.recentIds) recentIds = changes.recentIds;
  scope = {
    listingIds: new Set([...savedIds, ...recentIds]),
    searchKey: changes.filters ? JSON.stringify(changes.filters) : scope.searchKey,
  };
}

export function shouldPersist(query: { queryKey: readonly unknown[]; state: { status: string } }, current: Scope = scope): boolean {
  if (query.state.status !== "success") return false;
  const [kind, arg] = query.queryKey;
  if (kind === "listing") return current.listingIds.has(String(arg));
  if (kind === "search") return JSON.stringify(arg) === current.searchKey;
  return false;
}

type Pages = { pages: unknown[]; pageParams: unknown[] };

// The last search is kept offline, but only its first page.
export function trimSearchPages(data: Pages): Pages {
  return { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
}

type Row = Record<string, any>;

// Put full listing rows (e.g. from the Saved tab) where the listing screen
// looks, so they open offline.
export function seedListings(client: QueryClient, rows: Row[]) {
  for (const row of rows) client.setQueryData(["listing", String(row.id)], row);
}

// Listings already in the cache, in the given order; missing ones skipped.
export function cachedListings(client: QueryClient, ids: string[]): Row[] {
  return ids.map((id) => client.getQueryData<Row>(["listing", id])).filter((l): l is Row => Boolean(l));
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: PERSIST_MAX_AGE, staleTime: 60 * 1000 } },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "ile:query-cache",
  serialize: (client: PersistedClient) => {
    const queries = client.clientState.queries.map((q) =>
      q.queryKey[0] === "search" && q.state.data ? { ...q, state: { ...q.state, data: trimSearchPages(q.state.data as Pages) } } : q
    );
    return JSON.stringify({ ...client, clientState: { ...client.clientState, queries } });
  },
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false))
);
