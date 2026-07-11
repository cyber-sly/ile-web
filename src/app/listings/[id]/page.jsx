"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, BedDouble, CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";

export default function ListingDetailPage() {
  const { id } = useParams();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferredDate, setPreferredDate] = useState("");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    async function fetchListing() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) setListing(data);
      setLoading(false);
    }

    fetchListing();
  }, [id]);

  async function handleBookInspection(e) {
    e.preventDefault();
    setMessage("");
    setBooking(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please log in as a tenant to book an inspection.");
      setMessageType("error");
      setBooking(false);
      return;
    }

    const { error: insertError } = await supabase.from("inspections").insert({
      listing_id: id,
      tenant_id: user.id,
      preferred_date: preferredDate,
    });

    if (insertError) {
      setMessage(insertError.message);
      setMessageType("error");
      setBooking(false);
      return;
    }

    setMessage("Inspection request sent! The landlord will confirm soon.");
    setMessageType("success");
    setBooking(false);
    setPreferredDate("");
  }

  if (loading) return <p className="p-6 text-ink/60">Loading...</p>;
  if (!listing) return <p className="p-6 text-ink/60">Listing not found.</p>;

  return (
    <div className="max-w-lg mx-auto p-6">
      {listing.image_url && (
        <img
          src={listing.image_url}
          alt={listing.title}
          className="w-full h-64 object-cover rounded-xl"
        />
      )}
      <h1 className="font-display text-2xl font-semibold text-ink mt-4">{listing.title}</h1>
      <p className="flex items-center gap-1.5 text-ink/60 mt-1">
        <MapPin size={16} /> {listing.location}
      </p>
      <p className="flex items-center gap-1.5 text-ink/60">
        <BedDouble size={16} /> {listing.bedrooms} bedroom(s)
      </p>
      <p className="text-palm font-semibold text-lg mt-2">
        ₦{Number(listing.price).toLocaleString()}/year
      </p>

      <div className="mt-6 p-4 bg-white border border-mist rounded-xl shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
          <CalendarDays size={18} /> Book an Inspection
        </h2>
        <form onSubmit={handleBookInspection} className="flex flex-col gap-3">
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            required
            className="border border-mist rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-palm"
          />
          <button
            type="submit"
            disabled={booking}
            className="bg-palm text-white rounded-lg py-2 font-semibold hover:bg-palm-dark disabled:opacity-50 transition-colors"
          >
            {booking ? "Booking..." : "Request Inspection"}
          </button>
          {message && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                messageType === "error" ? "text-clay" : "text-palm"
              }`}
            >
              {messageType === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}