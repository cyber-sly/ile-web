"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { friendlyError } from "@shared/errors.js";
import { formatDate, formatNaira } from "@/lib/format";
import { fetchMyStays, fetchTakenDates, lagosToday, MAX_STAY_NOTE, requestStay, STAY_STATUS, stayQuote, validateStayRequest } from "@/lib/stays";
import DateRangePicker from "@/components/DateRangePicker";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";

// The guest's side of a stay: pick dates and guests, see the total, and send
// a stay request. Shows the guest's existing request for this place instead.
export default function StayBookingForm({ listing, user }) {
  const today = lagosToday();
  const maxGuests = Number(listing.max_guests) || 1;
  const [dates, setDates] = useState({ checkIn: "", checkOut: "" });
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [taken, setTaken] = useState([]);
  const [mine, setMine] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchTakenDates(listing.id).then((t) => live && setTaken(t));
    fetchMyStays(user.id)
      .then((list) => {
        if (!live) return;
        const current = list.find((s) => s.listing_id === listing.id && ["requested", "accepted"].includes(s.status) && s.check_out > today);
        setMine(current || null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [listing.id, user.id, today]);

  const quote = dates.checkIn && dates.checkOut ? stayQuote(listing, dates.checkIn, dates.checkOut) : null;

  async function submit(e) {
    e.preventDefault();
    const found = validateStayRequest(listing, { ...dates, guests, note }, taken, today);
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const id = await requestStay({ listingId: listing.id, ...dates, guests, note });
      setMine({ id, listing_id: listing.id, status: "requested", check_in: dates.checkIn, check_out: dates.checkOut, guests, total: quote.total });
    } catch (err) {
      setError(friendlyError(err));
    }
    setBusy(false);
  }

  if (mine) {
    return (
      <div>
        <p className="font-semibold text-ink">Your stay</p>
        <p className="mt-1 text-sm text-ink-muted">
          {formatDate(mine.check_in)} – {formatDate(mine.check_out)} · {mine.guests} {mine.guests === 1 ? "guest" : "guests"}
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">
          {STAY_STATUS[mine.status]?.label}
          {mine.status === "requested" ? " · waiting for the host to accept" : " · pay the host directly"}
        </p>
        <Link href="/my-bookings" className={button({ variant: "neutral", full: true, className: "mt-4" })}>
          See my bookings
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="font-semibold text-ink">Fix a booking</p>
      <DateRangePicker checkIn={dates.checkIn} checkOut={dates.checkOut} taken={taken} today={today} onChange={setDates} />
      {(errors.checkIn || errors.checkOut) && <p className="-mt-2 text-sm font-medium text-clay">{errors.checkIn || errors.checkOut}</p>}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Guests</span>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Fewer guests" disabled={guests <= 1} onClick={() => setGuests((g) => Math.max(1, g - 1))} className={button({ variant: "neutral", size: "sm" })}>
            <Minus size={15} aria-hidden="true" />
          </button>
          <span className="w-6 text-center font-bold tabular-nums text-ink" aria-live="polite">
            {guests}
          </span>
          <button type="button" aria-label="More guests" disabled={guests >= maxGuests} onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} className={button({ variant: "neutral", size: "sm" })}>
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
      {errors.guests && <p className="-mt-2 text-sm font-medium text-clay">{errors.guests}</p>}

      {quote && quote.nights > 0 && (
        <dl className="space-y-1 rounded-[var(--radius-control)] bg-cream p-3 text-sm">
          {quote.rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-3 text-ink-muted">
              <dt>{r.label}</dt>
              <dd className="tabular-nums">{formatNaira(r.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-line-strong pt-1.5 font-bold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatNaira(quote.total)}</dd>
          </div>
        </dl>
      )}

      <Field
        as="textarea"
        label="Note to the host"
        optional
        rows={2}
        maxLength={MAX_STAY_NOTE}
        placeholder="e.g. Arriving around 6pm with my partner."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={errors.note}
      />
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={busy} className={button({ size: "lg", full: true })}>
        {busy ? "Sending…" : "Fix a booking"}
      </button>
      <p className="text-xs text-ink-muted">The host accepts or declines your request. Pay the host directly. Never pay before you&apos;ve confirmed the place is real.</p>
    </form>
  );
}
