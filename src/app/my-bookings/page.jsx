"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Bookmark, MapPin, CalendarDays, Inbox } from "lucide-react";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

    fetchBookings();
  }, []);

  if (loading) return <p className="p-6 text-ink/60">Loading your bookings...</p>;
  if (error) return <p className="p-6 text-clay">{error}</p>;

  const statusColors = {
    pending: "bg-sun/20 text-sun",
    confirmed: "bg-palm/15 text-palm",
    done: "bg-mist text-ink/60",
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
                  {booking.status}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-ink/60 text-sm">
                <MapPin size={14} /> {booking.listings?.location}
              </p>
              <p className="flex items-center gap-1.5 text-ink/60 text-sm">
                <CalendarDays size={14} /> Requested for {booking.preferred_date}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}