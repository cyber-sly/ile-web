"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Is this night already booked? A stay covers check-in up to (not including) check-out.
const isTaken = (date, taken) => taken.some((t) => t.check_in <= date && date < t.check_out);

// Month calendar for choosing check-in then check-out. Past and booked nights
// can't start a stay; check-out may land on a booked day (the next guest's
// check-in), but the range can't cross a booked night.
export default function DateRangePicker({ checkIn, checkOut, onChange, taken = [], today }) {
  const start = checkIn || today;
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const label = first.toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
  const thisMonth = view.y === Number(today.slice(0, 4)) && view.m === Number(today.slice(5, 7)) - 1;

  function move(delta) {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  }

  function crossesBooked(from, to) {
    return taken.some((t) => t.check_in < to && from < t.check_out);
  }

  function pick(date) {
    if (!checkIn || checkOut || date <= checkIn) {
      if (date < today || isTaken(date, taken)) return;
      onChange({ checkIn: date, checkOut: "" });
    } else if (!crossesBooked(checkIn, date)) {
      onChange({ checkIn, checkOut: date });
    } else {
      onChange({ checkIn: date < today || isTaken(date, taken) ? "" : date, checkOut: "" });
    }
  }

  return (
    <div className="rounded-[var(--radius-control)] border border-line-strong p-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={thisMonth} aria-label="Previous month" className="rounded-full p-1.5 text-ink hover:bg-ink/5 disabled:opacity-30">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <button type="button" onClick={() => move(1)} aria-label="Next month" className="rounded-full p-1.5 text-ink hover:bg-ink/5">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-muted">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`x${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = iso(view.y, view.m, i + 1);
          const past = date < today;
          const booked = isTaken(date, taken);
          const isStart = date === checkIn;
          const isEnd = date === checkOut;
          const inRange = checkIn && checkOut && date > checkIn && date < checkOut;
          const canEnd = checkIn && !checkOut && date > checkIn && !crossesBooked(checkIn, date);
          const disabled = past || (booked && !canEnd);
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => pick(date)}
              aria-pressed={isStart || isEnd}
              aria-label={`${date}${booked ? ", booked" : ""}`}
              className={`h-9 rounded-[var(--radius-control)] text-sm tabular-nums transition-colors ${
                isStart || isEnd
                  ? "bg-palm font-bold text-white"
                  : inRange
                    ? "bg-palm-soft text-palm"
                    : disabled
                      ? `text-ink-muted/40 ${booked ? "line-through" : ""}`
                      : "text-ink hover:bg-ink/5"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {!checkIn ? "Choose your check-in date." : !checkOut ? "Now choose your check-out date." : "Tap a date to start again."}
      </p>
    </div>
  );
}
