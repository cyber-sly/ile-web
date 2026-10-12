import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteMyAccount } from "@shared/account.js";
import { supabase } from "./supabase";
import { persister, queryClient } from "./queryClient";
import { drafts } from "./drafts";
import { TOKEN_KEY } from "./push";
import { removeToken } from "./pushTokens";
import { deleteAccountOnPhone, logOutEverywhere } from "./accountRules";

// Everything this phone keeps about the account (used after deletion).
export async function clearThisDevice(userId: string) {
  await drafts.clearUser(userId);
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, "ile:saved-listings", "ile:last-search", "ile:recent-listings", "ile:outbox", `ile:saved-account-${userId}`]);
  } catch {}
  queryClient.clear();
  await persister.removeClient();
}

export function deleteAccountHere(userId: string) {
  return deleteAccountOnPhone({
    deleteAccount: () => deleteMyAccount(supabase, userId),
    clearDevice: () => clearThisDevice(userId),
  });
}

export function logOutEverywhereHere() {
  return logOutEverywhere({
    removeToken: async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        await removeToken(supabase, token);
        await AsyncStorage.removeItem(TOKEN_KEY);
      }
    },
    signOutGlobal: () => supabase.auth.signOut({ scope: "global" }),
    signOutLocal: async () => {
      await supabase.auth.signOut({ scope: "local" });
    },
  });
}
