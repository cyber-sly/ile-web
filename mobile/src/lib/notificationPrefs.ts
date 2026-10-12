// Which notifications a person wants. No saved row means everything is on.
export type NotificationPrefs = { messages: boolean; bookings: boolean; reminders: boolean; hide_message_text: boolean };

export const DEFAULT_PREFS: NotificationPrefs = { messages: true, bookings: true, reminders: true, hide_message_text: false };

type Client = any;

export async function fetchPrefs(client: Client, userId: string): Promise<NotificationPrefs> {
  const { data, error } = await client.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ...DEFAULT_PREFS };
  return {
    messages: data.messages,
    bookings: data.bookings,
    reminders: data.reminders,
    hide_message_text: data.hide_message_text,
  };
}

export async function savePrefs(client: Client, userId: string, prefs: NotificationPrefs) {
  const { error } = await client
    .from("notification_prefs")
    .upsert({ user_id: userId, ...prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
