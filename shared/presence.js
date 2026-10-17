// Online / last seen for chat partners. Needs supabase/presence_edit.sql;
// before it is run the functions below quietly do nothing.

export const ONLINE_MS = 2 * 60 * 1000;
export const CHECK_IN_MS = 60 * 1000;

const ZONE = "Africa/Lagos";
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const lagosYear = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, year: "numeric" }).format(d);

// "Online", "Last seen 10:42", "Last seen yesterday", "Last seen 12 Oct", or
// null when there's nothing to show.
/** @param {string | null | undefined} lastSeenAt @param {Date} [now] */
export function presenceLabel(lastSeenAt, now = new Date()) {
  if (!lastSeenAt) return null;
  const seen = new Date(lastSeenAt);
  if (Number.isNaN(seen.getTime())) return null;
  if (now.getTime() - seen.getTime() < ONLINE_MS) return { online: true, text: "Online" };

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let when;
  if (dayKey(seen) === dayKey(now)) {
    when = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(seen);
  } else if (dayKey(seen) === dayKey(yesterday)) {
    when = "yesterday";
  } else {
    const sameYear = lagosYear(seen) === lagosYear(now);
    when = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "numeric", month: "short", ...(!sameYear && { year: "numeric" }) }).format(seen);
  }
  return { online: false, text: `Last seen ${when}` };
}

// Check in. Never throws: presence is a nice-to-have.
export async function touchPresence(client) {
  try {
    await client.rpc("touch_presence");
  } catch {
    // offline or SQL not run yet
  }
}

// { conversationId: lastSeenAt } for the other person in each chat.
/** @param {any} client @param {string[]} conversationIds @returns {Promise<Record<string, string>>} */
export async function fetchChatPresence(client, conversationIds) {
  const ids = [...new Set(conversationIds.filter(Boolean))].slice(0, 100);
  if (ids.length === 0) return {};
  try {
    const { data, error } = await client.rpc("chat_presence", { p_conversations: ids });
    if (error || !data) return {};
    return Object.fromEntries(data.map((r) => [r.conversation_id, r.last_seen_at]));
  } catch {
    return {};
  }
}
