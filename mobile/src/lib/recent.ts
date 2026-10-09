import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPersistScope } from "./queryClient";

// Recently viewed listings (newest first), kept on the device.
export const RECENT_MAX = 20;
const KEY = "ile:recent-listings";

export function pushRecent(list: string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

let recent: string[] = [];
const listeners = new Set<() => void>();

function set(next: string[]) {
  recent = next;
  setPersistScope({ recentIds: next });
  listeners.forEach((l) => l());
}

const loaded = (async () => {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    if (Array.isArray(list)) set(list.map(String));
  } catch {}
})();

export async function addRecent(id: string): Promise<void> {
  await loaded;
  set(pushRecent(recent, id));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(recent));
  } catch {}
}

export function useRecentIds(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => recent
  );
}
