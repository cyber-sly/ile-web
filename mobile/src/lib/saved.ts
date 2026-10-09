import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { createSavedStore } from "./savedStore";
import { setPersistScope } from "./queryClient";

// "device" -> logged-out saves; "account:<uid>" -> offline copy of the account's.
const storageKey = (key: string) => (key === "device" ? "ile:saved-listings" : `ile:saved-${key.replace(":", "-")}`);

const store = createSavedStore({
  client: supabase,
  storage: {
    async read(key) {
      try {
        const list = JSON.parse((await AsyncStorage.getItem(storageKey(key))) || "[]");
        return Array.isArray(list) ? list.map(String) : [];
      } catch {
        return [];
      }
    },
    async write(key, ids) {
      try {
        if (ids.length) await AsyncStorage.setItem(storageKey(key), JSON.stringify(ids));
        else await AsyncStorage.removeItem(storageKey(key));
      } catch {}
    },
  },
});

store.subscribe(() => setPersistScope({ savedIds: store.getIds() }));

// Catch up with saves made elsewhere once the phone is back online or reopened.
onlineManager.subscribe((online) => {
  if (online) store.refresh();
});
AppState.addEventListener("change", (state) => {
  if (state === "active") store.refresh();
});

// Called by SessionProvider whenever the signed-in user changes.
export function syncSavedAccount(userId: string | null) {
  return store.switchAccount(userId);
}

export function refreshSaved() {
  return store.refresh();
}

export function toggleSaved(id: string) {
  return store.toggle(id);
}

export function getSavedIds(): string[] {
  return store.getIds();
}

export function subscribeSaved(fn: () => void) {
  return store.subscribe(fn);
}

// The saved listing ids (as strings), newest first.
export function useSavedIds(): string[] {
  return useSyncExternalStore(store.subscribe, store.getIds);
}
