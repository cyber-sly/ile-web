"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatNaira } from "@/lib/format";
import { fetchPeople } from "@/lib/profile";
import { cancelStay, fetchMyStays, fetchStayRequests, lagosToday, respondStay, sortStays, STAY_STATUS, stayActions } from "@/lib/stays";
import { fetchReviewedStayIds } from "@shared/stays.js";
import MessageButton from "@/components/MessageButton";
import ReviewForm from "@/components/ReviewForm";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";

const TONES = { requested: "gold", accepted: "palm", declined: "clay", cancelled: "neutral" };

// Stay bookings: the host's requests on their listings (role "host", with
// listingIds) or the guest's own stays (role "guest"). Renders nothing until
// there is at least one stay.
export default function StayRequests({ role, user, listingIds = [], onLoaded }) {
  const [stays, setStays] = useState(null);
  const [people, setPeople] = useState({});
  const [reviewed, setReviewed] = useState(new Set());
  const [error, setError] = useState("");
  const today = lagosToday();
  const idsKey = listingIds.join(",");

  const load = useCallback(() => {
    const fetchList = role === "host" ? fetchStayRequests(idsKey ? idsKey.split(",") : []) : fetchMyStays(user.id);
    return fetchList
      .then(async (list) => {
        setStays(list);
        onLoaded?.(list.length);
        const others = role === "host" ? list.map((s) => s.guest_id) : list.map((s) => s.listings?.landlord_id).filter(Boolean);
        setPeople(await fetchPeople(others));
        setReviewed(await fetchReviewedStayIds(supabase, list.map((s) => s.id), user.id));
      })
      .catch((e) => {
        setError(friendlyError(e));
        setStays([]);
      });
  }, [role, user.id, idsKey, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  if (!stays || stays.length === 0) return error ? <Alert className="mb-6">{error}</Alert> : null;

  return (
    <section aria-labelledby="stays-heading" className="mb-10">
      <h2 id="stays-heading" className="font-serif text-2xl font-semibold text-ink">
        {role === "host" ? "Stay requests" : "Your stays"}
      </h2>
      {error && <Alert className="mt-4">{error}</Alert>}
      <ul className="mt-4 flex flex-col gap-3">
        {sortStays(stays, today).map((s) => (
          <StayCard
            key={s.id}
            stay={s}
            role={role}
            user={user}
            today={today}
            person={people[role === "host" ? s.guest_id : s.listings?.landlord_id]}
            reviewed={reviewed.has(s.id)}
            onChanged={load}
            onError={setError}
          />
        ))}
      </ul>
    </section>
  );
}

function StayCard({ stay: s, role, user, today, person, reviewed, onChanged, onError }) {
  const actions = stayActions(s, role, today);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const name = person?.full_name || (role === "host" ? "Guest" : "Host");

  async function run(task) {
    setBusy(true);
    onError("");
    try {
      await task();
      setDeclining(false);
      onChanged();
    } catch (e) {
      onError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/listings/${s.listing_id}`} className="line-clamp-1 font-semibold text-ink hover:text-palm">
            {s.listings?.title || "Listing"}
          </Link>
          <p className="text-sm text-ink-muted">
            {formatDate(s.check_in)} – {formatDate(s.check_out)} · {s.nights} {s.nights === 1 ? "night" : "nights"} · {s.guests}{" "}
            {s.guests === 1 ? "guest" : "guests"}
          </p>
          <p className="text-sm text-ink">
            {role === "host" ? `${name} · ` : ""}
            <strong>{formatNaira(s.total)}</strong> total
          </p>
        </div>
        <Badge tone={TONES[s.status]}>{STAY_STATUS[s.status]?.label}</Badge>
      </div>
      {s.note && <p className="mt-2 rounded-[var(--radius-control)] bg-cream p-2.5 text-sm text-ink">&ldquo;{s.note}&rdquo;</p>}
      {s.status === "declined" && s.decline_reason && <p className="mt-2 text-sm text-ink-muted">Reason: {s.decline_reason}</p>}

      {declining ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor={`reason-${s.id}`}>
            Reason <span className="font-normal text-ink-muted">· Optional</span>
          </label>
          <input
            id={`reason-${s.id}`}
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Those dates aren't free"
            className="h-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-sm outline-none focus:border-palm"
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => respondStay(s.id, false, reason))} className={button({ variant: "danger", size: "sm" })}>
              Decline request
            </button>
            <button type="button" onClick={() => setDeclining(false)} className={button({ variant: "ghost", size: "sm" })}>
              Keep it
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.accept && (
            <button type="button" disabled={busy} onClick={() => run(() => respondStay(s.id, true, ""))} className={button({ size: "sm" })}>
              Accept
            </button>
          )}
          {actions.decline && (
            <button type="button" disabled={busy} onClick={() => setDeclining(true)} className={button({ variant: "neutral", size: "sm" })}>
              Decline
            </button>
          )}
          {actions.cancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm("Cancel this stay? The other person will be told.") && run(() => cancelStay(s.id))}
              className={button({ variant: "danger-ghost", size: "sm" })}
            >
              Cancel stay
            </button>
          )}
          {actions.review && !reviewed && (
            <ReviewForm stayId={s.id} reviewing={role === "host" ? "tenant" : "lister"} name={name} onDone={onChanged} />
          )}
          <MessageButton listingId={s.listing_id} tenantId={role === "host" ? s.guest_id : null} user={user} />
        </div>
      )}
    </li>
  );
}
