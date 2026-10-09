import { dayLabel } from "@shared/messaging.js";
import type { OutboxItem } from "./outbox";

export type Message = { id: string; created_at: string; sender_id: string | null; read_at: string | null; body: string };
// A message on screen: from the server, or still in the outbox.
export type ChatRow = Message & { pending?: "waiting" | "sending" | "failed"; localId?: string };

// Server messages in time order (no duplicates), then messages still waiting to send.
export function mergeMessages(server: Message[], pending: OutboxItem[]): ChatRow[] {
  const byId = new Map(server.map((m) => [m.id, m]));
  const sorted = [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const waiting: ChatRow[] = pending.map((p) => ({
    id: p.localId,
    localId: p.localId,
    created_at: p.createdAt,
    sender_id: "me",
    read_at: null,
    body: p.body,
    pending: p.state,
  }));
  return [...sorted, ...waiting];
}

// A "Today" / "Yesterday" / date label before the first message of each day.
export function withDayBreaks(rows: ChatRow[], now = new Date()): (ChatRow | { day: string; id: string })[] {
  const out: (ChatRow | { day: string; id: string })[] = [];
  let last = "";
  for (const r of rows) {
    const day = dayLabel(r.created_at, now);
    if (day !== last) {
      out.push({ day, id: `day-${r.created_at}` });
      last = day;
    }
    out.push(r);
  }
  return out;
}

// Your newest message the other person has read ("· Seen" goes under it).
export function lastSeenId(rows: ChatRow[], userId: string): string | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.sender_id === userId && r.read_at && !r.pending) return r.id;
  }
  return null;
}
