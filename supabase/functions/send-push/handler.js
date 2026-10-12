// send-push: delivers pending notifications through the Expo Push API.
// Plain JS (no Deno APIs) so it can be tested with Node; index.ts wires it up.
import { buildMessages, chunk, invalidTokens } from "../_shared/notifications.js";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";

// deps: { secret, db, fetchImpl, expoToken? }
// db: claimPending(limit), tokensFor(userIds), prefsFor(userIds), deleteTokens(tokens), unclaim(ids)
export async function handle(request, { secret, db, fetchImpl, expoToken }) {
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db.claimPending(500);
  if (rows.length === 0) return Response.json({ sent: 0, skipped: 0 });

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [tokens, prefs] = await Promise.all([db.tokensFor(userIds), db.prefsFor(userIds)]);
  const { messages, skipped } = buildMessages(rows, tokens, prefs);

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  let sent = 0;
  const batches = chunk(messages);
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const res = await fetchImpl(EXPO_URL, { method: "POST", headers, body: JSON.stringify(batch) });
      if (!res.ok) throw new Error(`Expo answered ${res.status}`);
      const { data: tickets = [] } = await res.json();
      const gone = invalidTokens(batch, tickets);
      if (gone.length) await db.deleteTokens(gone);
      sent += batch.length;
    } catch {
      // Expo unreachable: hand the rest back so the next sweep retries them.
      const left = batches.slice(i).flat().map((m) => m.data.notificationId);
      await db.unclaim([...new Set(left)]);
      return Response.json({ sent, skipped: skipped.length, retry: left.length }, { status: 502 });
    }
  }
  return Response.json({ sent, skipped: skipped.length });
}
