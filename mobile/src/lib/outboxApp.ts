import { useSyncExternalStore } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onlineManager } from "@tanstack/react-query";
import { sendMessage } from "@shared/messaging.js";
import { supabase } from "./supabase";
import { queryClient } from "./queryClient";
import { createOutbox, type OutboxItem } from "./outbox";

const KEY = "ile:outbox";

export const outbox = createOutbox({
  storage: {
    async read() {
      try {
        const list = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    async write(items) {
      try {
        if (items.length) await AsyncStorage.setItem(KEY, JSON.stringify(items));
        else await AsyncStorage.removeItem(KEY);
      } catch {}
    },
  },
  async send(item) {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw Object.assign(new Error("Logged out"), { retryable: true });
    try {
      const row = await sendMessage(supabase, item.conversationId, userId, item.body);
      queryClient.invalidateQueries({ queryKey: ["chat", item.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      return row;
    } catch (e) {
      // No database error code means the request never got an answer.
      const code = (e as { code?: string }).code;
      throw Object.assign(e as Error, { retryable: !code || !onlineManager.isOnline() });
    }
  },
});

outbox.flush();
onlineManager.subscribe((online) => {
  if (online) outbox.flush();
});
AppState.addEventListener("change", (state) => {
  if (state === "active") outbox.flush();
});

export function useOutboxItems(conversationId: string): OutboxItem[] {
  return useSyncExternalStore(outbox.subscribe, () => outbox.items(conversationId));
}
