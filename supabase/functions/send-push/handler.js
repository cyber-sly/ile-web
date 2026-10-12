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

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  const done = new Set(); // notification ids handed to Expo or deliberately skipped
  let sent = 0;
  let skippedCount = 0;
  try {
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const [tokens, prefs] = await Promise.all([db.tokensFor(userIds), db.prefsFor(userIds)]);
    const { messages, skipped } = buildMessages(rows, tokens, prefs);
    skipped.forEach((id) => done.add(id));
    skippedCount = skipped.length;

    for (const batch of chunk(messages)) {
      const res = await fetchImpl(EXPO_URL, { method: "POST", headers, body: JSON.stringify(batch) });
      if (!res.ok) throw new Error(`Expo answered ${res.status}`);
      const { data: tickets = [] } = await res.json();
      batch.forEach((m) => done.add(m.data.notificationId));
      tickets.forEach((t, i) => {
        if (t?.status === "ok") sent += 1;
        else console.error("Push refused", batch[i]?.to, t?.details?.error || "", t?.message || "");
      });
      const gone = invalidTokens(batch, tickets);
      if (gone.length) await db.deleteTokens(gone);
    }
  } catch (err) {
    // A lookup failed or Expo was unreachable: hand back everything not yet
    // delivered so the next sweep retries it.
    console.error("send-push failed", String(err));
    const left = rows.map((r) => r.id).filter((id) => !done.has(id));
    if (left.length) await db.unclaim(left);
    return Response.json({ sent, skipped: skippedCount, retry: left.length }, { status: 502 });
  }
  return Response.json({ sent, skipped: skippedCount });
}
