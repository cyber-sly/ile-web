"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatTime, formatDateTime } from "@/lib/format";
import { button } from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Zap } from "lucide-react";

function dayParts(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString("en-NG", { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString("en-NG", { month: "short" }),
  };
}

// Pick from the lister's open viewing times; booking is confirmed instantly.
// `slots` is [{ slot_date: "2026-10-12", slot_time: "10:00:00" }, ...].
export default function SlotPicker({ listingId, slots, onBooked }) {
  const days = useMemo(() => {
    const byDay = new Map();
    for (const s of slots) {
      if (!byDay.has(s.slot_date)) byDay.set(s.slot_date, []);
      byDay.get(s.slot_date).push(s.slot_time);
    }
    return [...byDay.entries()].map(([date, times]) => ({ date, times }));
  }, [slots]);

  const [date, setDate] = useState(days[0]?.date);
  const [time, setTime] = useState(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const times = days.find((d) => d.date === date)?.times || [];

  async function book() {
    setBooking(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("book_viewing_slot", {
      p_listing: listingId,
      p_date: date,
      p_time: time,
    });
    setBooking(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onBooked({ id: data, status: "confirmed", preferred_date: date, preferred_time: time });
  }

  return (
    <div>
      <p className="font-semibold text-ink">Pick a viewing time</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
        <Zap size={14} className="text-gold" aria-hidden="true" /> Confirmed instantly. Free.
      </p>

      <div role="radiogroup" aria-label="Day" className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((d) => {
          const p = dayParts(d.date);
          const on = d.date === date;
          return (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setDate(d.date);
                setTime(null);
              }}
              className={`flex w-14 shrink-0 flex-col items-center rounded-[var(--radius-control)] border py-2 transition-colors ${
                on ? "border-palm bg-palm text-white" : "border-line-strong bg-surface text-ink hover:border-ink/30"
              }`}
            >
              <span className={`text-[11px] font-semibold uppercase ${on ? "text-white/80" : "text-ink-muted"}`}>{p.weekday}</span>
              <span className="text-lg font-bold leading-tight">{p.day}</span>
              <span className={`text-[11px] ${on ? "text-white/80" : "text-ink-muted"}`}>{p.month}</span>
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Time" className="mt-3 grid grid-cols-3 gap-2">
        {times.map((t) => {
          const on = t === time;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTime(t)}
              className={`h-10 rounded-[var(--radius-control)] border text-sm font-semibold transition-colors ${
                on ? "border-palm bg-palm-soft text-palm" : "border-line-strong bg-surface text-ink hover:border-ink/30"
              }`}
            >
              {formatTime(t)}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={book} disabled={!time || booking} className={button({ full: true, size: "lg", className: "mt-4" })}>
        {booking ? "Booking…" : time ? `Book ${formatDateTime(date, time)}` : "Choose a time"}
      </button>
      {error && <Alert className="mt-3">{error}</Alert>}
    </div>
  );
}
