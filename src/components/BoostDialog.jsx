"use client";

import { useState } from "react";
import { Minus, Plus, Rocket } from "lucide-react";
import { friendlyError } from "@shared/errors.js";
import { formatDate } from "@/lib/format";
import { spendBoostDays } from "@/lib/referrals";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { toast } from "@/lib/toast";

// Spend boost days to put a listing first in search and "Fresh on Ile".
export default function BoostDialog({ listing, balance, onDone, onClose }) {
  const max = Math.min(30, balance);
  const [days, setDays] = useState(Math.max(1, Math.min(7, max)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [until, setUntil] = useState(null);

  async function boost() {
    setBusy(true);
    setError("");
    try {
      const newUntil = await spendBoostDays(listing.id, days);
      setUntil(newUntil);
      toast("Listing boosted");
      onDone(listing.id, newUntil);
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  const dayWord = (n) => (n === 1 ? "day" : "days");

  return (
    <Dialog title="Boost this listing" onClose={onClose}>
        <p className="mt-1 line-clamp-1 text-sm text-ink-muted">{listing.title}</p>

        {until ? (
          <p className="mt-5 rounded-[var(--radius-control)] bg-palm-soft p-4 font-semibold text-palm">
            Boosted until {formatDate(String(until).slice(0, 10))}.
          </p>
        ) : max < 1 ? (
          <p className="mt-5 text-ink-muted">
            You don&apos;t have any boost days yet. Invite listers and home-seekers with your code to earn some.
          </p>
        ) : (
          <>
            <p className="mt-5 text-sm text-ink-muted">
              Boosted listings show first in search and on the home page. You have {balance} boost {dayWord(balance)}.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                type="button"
                aria-label="Fewer days"
                disabled={days <= 1}
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                className={button({ variant: "neutral", size: "sm" })}
              >
                <Minus size={16} aria-hidden="true" />
              </button>
              <span className="min-w-24 text-center text-xl font-bold text-ink" aria-live="polite">
                {days} {dayWord(days)}
              </span>
              <button
                type="button"
                aria-label="More days"
                disabled={days >= max}
                onClick={() => setDays((d) => Math.min(max, d + 1))}
                className={button({ variant: "neutral", size: "sm" })}
              >
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
            {error && <Alert className="mt-4">{error}</Alert>}
            <button type="button" disabled={busy} onClick={boost} className={button({ size: "lg", full: true, className: "mt-5" })}>
              <Rocket size={18} aria-hidden="true" /> {busy ? "Boosting…" : `Boost for ${days} ${dayWord(days)}`}
            </button>
          </>
        )}
    </Dialog>
  );
}
