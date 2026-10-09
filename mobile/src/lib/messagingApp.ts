import { router } from "expo-router";
import { startConversation } from "@shared/messaging.js";
import { supabase } from "./supabase";

// Open (or start) the chat about a listing. Listers pass the home-seeker.
export async function openChat(listingId: string, tenantId?: string): Promise<void> {
  const id = await startConversation(supabase, listingId, tenantId ?? null);
  router.push({ pathname: "/chat/[id]", params: { id: String(id) } });
}
