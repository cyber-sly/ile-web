import AsyncStorage from "@react-native-async-storage/async-storage";

// Recently viewed listings (newest first), kept on the device.
export const RECENT_MAX = 20;
const KEY = "ile:recent-listings";

export function pushRecent(list: string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export async function readRecent(): Promise<string[]> {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

export async function addRecent(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pushRecent(await readRecent(), id)));
  } catch {}
}
