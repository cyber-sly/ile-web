"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "@shared/errors.js";
import { formatDate } from "@/lib/format";
import { fetchHeldRewards, resolveHeldReward } from "@/lib/referrals";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";

const REASONS = { invited_lister: "Invited a lister", invited_seekers: "Invited 5 home-seekers" };

// Rewards held because one person's code had an unusual burst of sign-ups.
export default function HeldRewards() {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchHeldRewards()
      .then(setRows)
      .catch((e) => setError(friendlyError(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id, approve) {
    setBusy(id);
    setError("");
    try {
      await resolveHeldReward(id, approve);
      load();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(null);
  }

  if (!rows) return null;

  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl font-semibold text-ink">Held rewards ({rows.length})</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Boost days held because more than 10 people confirmed through one code within an hour. Approve if it looks genuine.
      </p>
      {error && <Alert className="mt-4">{error}</Alert>}
      {rows.length === 0 ? (
        <p className="mt-4 text-ink-muted">Nothing held.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {r.inviter_name} · {r.days} days
                </p>
                <p className="text-sm text-ink-muted">
                  {REASONS[r.reason] || r.reason} · {formatDate(String(r.created_at).slice(0, 10))}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy === r.id} onClick={() => resolve(r.id, true)} className={button({ size: "sm" })}>
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => resolve(r.id, false)}
                  className={button({ variant: "danger-ghost", size: "sm" })}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
