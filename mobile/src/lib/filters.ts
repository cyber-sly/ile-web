import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyFilterChange, readFilters } from "@shared/search.js";
import { setPersistScope } from "./queryClient";

// Search filters: the same shape the website reads from its URL
// (tab, q, state, lga, ptype, purpose, min, max, beds, title, sort).
export type Filters = Record<string, string>;

export const DEFAULT_FILTERS: Filters = readFilters(new URLSearchParams());

const COUNTED = ["state", "lga", "ptype", "purpose", "min", "max", "beds", "title"];

// Number shown on the Filters button (tab, search text and sort aren't counted).
export function activeFilterCount(filters: Filters): number {
  return COUNTED.filter((k) => filters[k]).length;
}

// One shared store, kept on the phone so the app reopens on the last search.
const KEY = "ile:last-search";
let current: Filters = DEFAULT_FILTERS;
setPersistScope({ filters: current });
const listeners = new Set<() => void>();

function set(next: Filters) {
  current = next;
  setPersistScope({ filters: next });
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
}

AsyncStorage.getItem(KEY)
  .then((saved) => {
    // readFilters validates without the tab-change clearing.
    if (saved && current === DEFAULT_FILTERS) set(readFilters(new URLSearchParams(JSON.parse(saved))));
  })
  .catch(() => {});

export function changeFilters(changes: Filters) {
  set(applyFilterChange(current, changes));
}

export function useFilters(): [Filters, (changes: Filters) => void] {
  const filters = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
  return [filters, changeFilters];
}
