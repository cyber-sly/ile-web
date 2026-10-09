import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

// Query keys used across the app:
//   ["search", filters]        infinite search results
//   ["listing", id]            one listing
//   ["similar", id]            similar listings on the listing screen
//   ["saved-listings", ids]    the Saved tab
//   ["lister", userId]         lister name, photo, rating, reply time

export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

// Only what must work offline is kept across restarts, so the cache stays
// small (Android limits AsyncStorage size).
const PERSISTED = new Set(["listing", "saved-listings", "search"]);

export function shouldPersist(query: { queryKey: readonly unknown[]; state: { status: string } }): boolean {
  return query.state.status === "success" && PERSISTED.has(String(query.queryKey[0]));
}

type Pages = { pages: unknown[]; pageParams: unknown[] };

// The last search is kept offline, but only its first page.
export function trimSearchPages(data: Pages): Pages {
  return { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
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
