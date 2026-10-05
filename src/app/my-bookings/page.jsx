"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { formatNaira, formatDateTime } from "@/lib/format";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badge";
import { button } from "@/components/ui/Button";
import { MapPin, CalendarDays, Clock, CalendarX, ImageOff } from "lucide-react";

const ACTIVE = ["countered", "pending", "confirmed"];

export default function MyBookingsPage() {
  const user = useUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("inspections")
      .select("*, listings(id, title, location, price, listing_type, image_url)")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else setBookings(data);
        setLoading(false);
      });
  }, [user]);

  async function update(booking, changes, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setMutationError("");
    const { error: updateError } = await supabase.from("inspections").update(changes).eq("id", booking.id);
    if (updateError) {
      setMutationError(updateError.message);
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, ...changes } : b)));
  }

  if (user === undefined || (user && loading)) return <PageSkeleton />;

  if (!user) {
    return (
      <AccessWall
        title="Log in to see your viewings"
        primary={{ href: "/login?next=/my-bookings", label: "Log in" }}
        secondary={{ href: "/listings", label: "Browse listings" }}
      >
        Viewings you book on Ile are listed here.
      </AccessWall>
    );
  }

  // Things that need the user's attention first, then upcoming, then history.
  const order = (b) => (ACTIVE.includes(b.status) ? ACTIVE.indexOf(b.status) : 9);
  const sorted = [...bookings].sort((a, b) => order(a) - order(b));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">My viewings</h1>
      <p className="mt-2 text-ink-muted">Track the viewings you&apos;ve requested and respond to new times.</p>

      {error && <Alert className="mt-6">{error}</Alert>}
      {mutationError && <Alert className="mt-6">{mutationError}</Alert>}

      <div className="mt-8">
        {sorted.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No viewings booked yet"
            action={
              <Link href="/listings" className={button()}>
                Find a place to view
              </Link>
            }
          >
            Book a free viewing from any listing page.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-4">
            {sorted.map((b) => {
              const l = b.listings;
              return (
                <li
                  key={b.id}
                  className={`overflow-hidden rounded-[var(--radius-card)] border bg-surface ${
                    b.status === "countered" ? "border-gold" : "border-line"
                  }`}
                >
                  <div className="flex gap-4 p-4">
                    <Link href={`/listings/${l?.id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-line sm:h-24 sm:w-32">
                      {l?.image_url ? (
                        <img src={l.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-ink-muted/50">
                          <ImageOff size={22} aria-hidden="true" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/listings/${l?.id}`} className="line-clamp-1 font-semibold text-ink hover:text-palm">
                          {l?.title || "Listing"}
                        </Link>
                        <StatusBadge status={b.status} />
                      </div>
                      {l?.location && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
                          <MapPin size={14} aria-hidden="true" /> {l.location}
                        </p>
                      )}
                      {l?.price && (
                        <p className="mt-0.5 text-sm font-bold text-ink">
                          {formatNaira(l.price)}
                          {l.listing_type !== "sale" && <span className="font-medium text-ink-muted"> /yr</span>}
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-ink">
                        <CalendarDays size={15} className="shrink-0 text-palm" aria-hidden="true" />
                        {formatDateTime(b.preferred_date, b.preferred_time)}
                      </p>
                    </div>
                  </div>

                  {b.status === "countered" && (
                    <div className="border-t border-gold/40 bg-gold-soft px-4 py-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Clock size={16} className="text-gold-ink" aria-hidden="true" />
                        The lister suggested {formatDateTime(b.proposed_date, b.proposed_time)}
                      </p>
                      {b.landlord_note && <p className="mt-1 text-sm text-ink-muted">&ldquo;{b.landlord_note}&rdquo;</p>}
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            update(b, {
                              status: "confirmed",
                              preferred_date: b.proposed_date,
                              preferred_time: b.proposed_time,
                            })
                          }
                          className={button({ size: "sm" })}
                        >
                          Accept new time
                        </button>
                        <button
                          type="button"
                          onClick={() => update(b, { status: "declined" }, "Decline the suggested time? This closes the request.")}
                          className={button({ variant: "neutral", size: "sm" })}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {b.status === "pending" && (
                    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                      <p className="text-sm text-ink-muted">Waiting for the lister to confirm.</p>
                      <button
                        type="button"
                        onClick={() => update(b, { status: "cancelled" }, "Cancel this viewing request?")}
                        className={button({ variant: "danger-ghost", size: "sm" })}
                      >
                        Cancel request
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
