"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loginHref } from "@/lib/useUser";
import { formatNaira, formatDateTime } from "@/lib/format";
import { priceParts, periodOf, periodLabel, moveInCost, feeWarning, isAvailable } from "@/lib/property";
import { button } from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { CalendarDays, Clock, Pencil, Trash2, ShieldCheck, AlertTriangle, RotateCcw, KeyRound } from "lucide-react";

const ACTIVE = ["pending", "countered", "confirmed"];

// Sticky action panel on the listing page. Shows one of: the owner's manage
// actions, a login prompt, the visitor's existing booking, or the booking form.
export default function BookingPanel({ listing, user, onDelete, onStatusChange }) {
  const isRent = listing.listing_type === "rent";
  const isOwner = user && user.id === listing.landlord_id;
  const available = isAvailable(listing);
  const { amount, suffix } = priceParts(listing);
  const period = periodOf(listing);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-float)] sm:p-6">
      <p className="text-3xl font-bold tracking-tight text-ink">
        {amount}
        {suffix && <span className="text-base font-medium text-ink-muted"> {suffix}</span>}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {isRent ? `Rent ${periodLabel(period)}, paid to the lister` : period === "plot" ? "Price per plot" : "Asking price"}
      </p>

      <MoveInCost listing={listing} />

      <div className="mt-5 border-t border-line pt-5">
        {user === undefined ? (
          <div className="skeleton h-40 rounded-[var(--radius-control)]" />
        ) : isOwner ? (
          <OwnerActions listing={listing} onDelete={onDelete} onStatusChange={onStatusChange} />
        ) : !available ? (
          <p className="text-sm text-ink-muted">
            This listing is no longer taking viewings because it has been {listing.status === "sold" ? "sold" : "let"}.
          </p>
        ) : !user ? (
          <SignedOut listingId={listing.id} />
        ) : (
          <BookingForm listing={listing} user={user} />
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 text-sm text-ink-muted">
        <ShieldCheck size={17} className="mt-px shrink-0 text-palm" aria-hidden="true" />
        Viewings on Ile are free. Never pay an inspection fee to see a property.
      </p>
    </div>
  );
}

// Rent/price plus every fee the lister declared, added up.
function MoveInCost({ listing }) {
  const cost = moveInCost(listing);
  const warning = feeWarning(listing);
  if (!cost.hasExtras) return null;
  const isRent = listing.listing_type === "rent";

  return (
    <div className="mt-5 rounded-[var(--radius-control)] bg-cream p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound size={15} className="text-palm" aria-hidden="true" />
        {isRent ? "Total to move in" : "Estimated total cost"}
      </p>
      <dl className="mt-2 space-y-1 text-sm">
        {cost.rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 text-ink-muted">
            <dt>{r.label}</dt>
            <dd className="tabular-nums">{formatNaira(r.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-line-strong pt-1.5 text-base font-bold text-ink">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatNaira(cost.total)}</dd>
        </div>
      </dl>
      {warning && (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-clay">
          <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden="true" /> {warning}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-muted">As stated by the lister. Confirm every fee before you pay.</p>
    </div>
  );
}

function OwnerActions({ listing, onDelete, onStatusChange }) {
  const status = listing.status || "active";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const closedLabel = listing.listing_type === "sale" ? "sold" : "let";

  async function changeStatus(next) {
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase.from("listings").update({ status: next }).eq("id", listing.id);
    setBusy(false);
    if (updateError) setError(updateError.message);
    else onStatusChange?.(next);
  }

  return (
    <div>
      <p className="font-semibold text-ink">This is your listing</p>
      <p className="mt-1 text-sm text-ink-muted">
        {status === "active" ? "Viewing requests appear in your dashboard." : `Marked as ${status}. It's hidden from search.`}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Link href="/dashboard" className={button({ full: true })}>
          Open dashboard
        </Link>
        {status === "active" ? (
          <button type="button" disabled={busy} onClick={() => changeStatus(closedLabel)} className={button({ variant: "neutral", full: true })}>
            Mark as {closedLabel}
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => changeStatus("active")} className={button({ variant: "neutral", full: true })}>
            <RotateCcw size={15} aria-hidden="true" /> Relist
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/listings/${listing.id}/edit`} className={button({ variant: "ghost" })}>
            <Pencil size={15} aria-hidden="true" /> Edit
          </Link>
          <button type="button" onClick={onDelete} className={button({ variant: "danger-ghost" })}>
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
        </div>
        {error && <Alert>{error}</Alert>}
      </div>
    </div>
  );
}

function SignedOut({ listingId }) {
  const next = `/listings/${listingId}#book`;
  return (
    <div>
      <p className="font-semibold text-ink">Book a free viewing</p>
      <p className="mt-1 text-sm text-ink-muted">Log in or create a free account to pick a time.</p>
      <div className="mt-4 flex flex-col gap-2">
        <Link href={loginHref(next)} className={button({ full: true, size: "lg" })}>
          Log in to book
        </Link>
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className={button({ variant: "neutral", full: true })}>
          Create a free account
        </Link>
      </div>
    </div>
  );
}

function BookingForm({ listing, user }) {
  const [existing, setExisting] = useState(undefined);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  // One active request per listing: show it instead of letting people book twice.
  useEffect(() => {
    supabase
      .from("inspections")
      .select("id, status, preferred_date, preferred_time, proposed_date, proposed_time")
      .eq("listing_id", listing.id)
      .eq("tenant_id", user.id)
      .in("status", ACTIVE)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => setExisting(data?.[0] ?? null));
  }, [listing.id, user.id]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBooking(true);
    const { data, error: insertError } = await supabase
      .from("inspections")
      .insert({
        listing_id: listing.id,
        tenant_id: user.id,
        preferred_date: date,
        preferred_time: time || null,
      })
      .select("id, status, preferred_date, preferred_time")
      .single();
    setBooking(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setExisting(data);
  }

  if (existing === undefined) return <div className="skeleton h-40 rounded-[var(--radius-control)]" />;

  if (existing) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-ink">Your viewing</p>
          <StatusBadge status={existing.status} />
        </div>
        <p className="mt-2 flex items-center gap-2 text-sm text-ink">
          <CalendarDays size={16} className="text-palm" aria-hidden="true" />
          {existing.status === "countered"
            ? `Lister suggested ${formatDateTime(existing.proposed_date, existing.proposed_time)}`
            : formatDateTime(existing.preferred_date, existing.preferred_time)}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {existing.status === "pending" && "Request sent. The lister will confirm or suggest another time."}
          {existing.status === "countered" && "Accept or decline the new time in My viewings."}
          {existing.status === "confirmed" && "You're booked in. See you there."}
        </p>
        <Link href="/my-bookings" className={button({ variant: "neutral", full: true, className: "mt-4" })}>
          Go to My viewings
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="font-semibold text-ink">Book a free viewing</p>
      <Field
        label="Preferred date"
        type="date"
        icon={CalendarDays}
        min={today}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <Field
        label="Preferred time"
        optional
        type="time"
        icon={Clock}
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button type="submit" disabled={booking} className={button({ full: true, size: "lg" })}>
        {booking ? "Sending request…" : "Request viewing"}
      </button>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
