"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Bookmark, MapPin, CalendarDays, Inbox, Clock } from "lucide-react";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please log in to see your bookings.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("inspections")
      .select("*, listings(id, title, location, price)")
      .eq("tenant_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBookings(data);
    }
    setLoading(false);
  }

  async function acceptProposal(booking) {
    const { error: updateError } = await supabase
      .from("inspections")
      .update({
        status: "confirmed",
        preferred_date: booking.proposed_date,
        preferred_time: booking.proposed_time,
      })
      .eq("id", booking.id);

    if (!updateError) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? { ...b, status: "confirmed", preferred_date: b.proposed_date, preferred_time: b.proposed_time }
            : b
        )
      );
    }
  }

  async function declineProposal(bookingId) {
    const { error: updateError } = await supabase
      .from("inspections")
      .update({ status: "declined" })
      .eq("id", bookingId);

    if (!updateError) {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "declined" } : b)));
    }
  }

  async function cancelBooking(bookingId) {
    const confirmed = window.confirm("Cancel this inspection request?");
    if (!confirmed) return;

    const { error: updateError } = await supabase
      .from("inspections")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (!updateError) {
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b)));
    }
  }

  if (loading) return <p className="p-6 text-ink/60">Loading your bookings...</p>;
  if (error) return <p className="p-6 text-clay">{error}</p>;

  const statusColors = {
    pending: "bg-sun/20 text-sun",
    countered: "bg-clay/15 text-clay",
    confirmed: "bg-palm/15 text-palm",
    declined: "bg-mist text-clay/70",
    cancelled: "bg-mist text-ink/50",
    done: "bg-mist text-ink/60",
  };

  const statusLabels = {
    pending: "pending",
    countered: "new time proposed",
    confirmed: "confirmed",
    declined: "declined",
    cancelled: "cancelled",
    done: "done",
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6 flex items-center gap-2">
        <Bookmark className="text-palm" size={24} /> My Bookings
      </h1>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-mist rounded-xl">
          <Inbox className="text-ink/30" size={32} />
          <p className="text-ink/60">
            You haven't booked any inspections yet.{" "}
            <Link href="/listings" className="text-palm underline">
              Browse listings
            </Link>
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li key={booking.id} className="p-4 bg-white border border-mist rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <Link
                  href={`/listings/${booking.listings?.id}`}
                  className="font-medium text-ink hover:text-palm transition-colors"
                >
                  {booking.listings?.title}
                </Link>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[booking.status]}`}
                >
                  {statusLabels[booking.status] || booking.status}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-ink/60 text-sm">
                <MapPin size={14} /> {booking.listings?.location}
              </p>
              <p className="flex items-center gap-1.5 text-ink/60 text-sm">
                <CalendarDays size={14} /> Requested for {booking.preferred_date}
                {booking.preferred_time && ` at ${booking.preferred_time}`}
              </p>

              {booking.status === "countered" && (
                <div className="mt-3 p-3 bg-sun/10 rounded-lg">
                  <p className="flex items-center gap-1.5 text-ink/80 text-sm mb-1">
                    <Clock size={14} className="text-sun" /> Landlord proposed {booking.proposed_date}
                    {booking.proposed_time && ` at ${booking.proposed_time}`}
                  </p>
                  {booking.landlord_note && (
                    <p className="text-ink/60 text-sm mb-2">"{booking.landlord_note}"</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptProposal(booking)}
                      className="text-sm bg-palm text-white px-3 py-1 rounded-lg hover:bg-palm-dark transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineProposal(booking.id)}
                      className="text-sm bg-mist text-ink px-3 py-1 rounded-lg hover:bg-mist/70 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {booking.status === "pending" && (
                <div className="mt-3">
                  <button
                    onClick={() => cancelBooking(booking.id)}
                    className="text-sm bg-mist text-ink px-3 py-1 rounded-lg hover:bg-mist/70 transition-colors"
                  >
                    Cancel Request
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
