// Push notification rules, shared by the app and the send-push Edge Function.
// supabase/functions/_shared/notifications.js must stay an exact copy (a test
// checks it), because Edge Functions can only import files in their folder.

export const CATEGORY_BY_TYPE = {
  message: "messages",
  viewing_request: "bookings",
  viewing_booked: "bookings",
  viewing_confirmed: "bookings",
  viewing_countered: "bookings",
  viewing_declined: "bookings",
  viewing_cancelled: "bookings",
  review: "bookings",
  viewing_reminder: "reminders",
  still_available: "reminders",
};

const DEFAULT_PREFS = { messages: true, bookings: true, reminders: true, hide_message_text: false };

export function categoryOf(type) {
  return CATEGORY_BY_TYPE[type] || "bookings";
}

// One Expo push message per (notification, device), honouring each person's
// settings. Returns the messages and the ids of notifications not sent.
export function buildMessages(rows, tokensByUser, prefsByUser) {
  const messages = [];
  const skipped = [];
  for (const row of rows) {
    const prefs = { ...DEFAULT_PREFS, ...(prefsByUser[row.user_id] || {}) };
    const tokens = tokensByUser[row.user_id] || [];
    if (!prefs[categoryOf(row.type)] || tokens.length === 0) {
      skipped.push(row.id);
      continue;
    }
    const body = row.type === "message" && prefs.hide_message_text ? "Sent you a message" : row.body;
    for (const to of tokens) {
      messages.push({
        to,
        title: row.title,
        body,
        data: { ...(row.data || {}), notificationId: row.id },
        sound: "default",
        channelId: "default",
        priority: "high",
      });
    }
  }
  return { messages, skipped };
}

// Expo accepts up to 100 messages per request.
export function chunk(list, size = 100) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// Devices Expo says no longer exist (app uninstalled, token expired).
export function invalidTokens(messages, tickets) {
  return tickets
    .map((t, i) => (t?.status === "error" && t.details?.error === "DeviceNotRegistered" ? messages[i]?.to : null))
    .filter(Boolean);
}

// Where tapping a notification opens. The Viewings tab shows listers their Dashboard.
export function notificationRoute(data) {
  switch (data?.route) {
    case "chat":
      return data.id ? `/chat/${data.id}` : "/inbox";
    case "viewings":
    case "dashboard":
      return "/viewings";
    case "account":
      return "/account";
    default:
      return "/";
  }
}
