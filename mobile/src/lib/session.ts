import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { isInactive } from "./inactivity";

const LAST_ACTIVE_KEY = "ile:last-active";

export async function touchActivity(): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

// Signs out on this device when it has been unused for too long.
// Returns true if it signed the user out.
export async function enforceInactivity(): Promise<boolean> {
  const last = Number(await AsyncStorage.getItem(LAST_ACTIVE_KEY)) || null;
  if (!isInactive(last, Date.now())) return false;
  await supabase.auth.signOut({ scope: "local" });
  return true;
}
