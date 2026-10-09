import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { createSavedStore } from "./savedStore";

const KEY = "ile:saved-listings";

const store = createSavedStore({
  client: supabase,
  storage: {
    async read() {
      try {
        const list = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
        return Array.isArray(list) ? list.map(String) : [];
      } catch {
        return [];
      }
    },
    async write(ids) {
      try {
        if (ids.length) await AsyncStorage.setItem(KEY, JSON.stringify(ids));
        else await AsyncStorage.removeItem(KEY);
      } catch {}
    },
  },
});

// Called by SessionProvider whenever the signed-in user changes.
export function syncSavedAccount(userId: string | null) {
  return store.switchAccount(userId);
}

export function toggleSaved(id: string) {
  return store.toggle(id);
}

// The saved listing ids (as strings), newest first.
export function useSavedIds(): string[] {
  return useSyncExternalStore(store.subscribe, store.getIds);
}
