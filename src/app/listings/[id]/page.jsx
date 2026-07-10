"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferredDate, setPreferredDate] = useState("");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchListing() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (!error) {
        setListing(data);
      }
      setLoading(false);
    }

    fetchListing();
  }, [id]);

  async function handleBookInspection(e) {
    e.preventDefault();
    setMessage("");
    setBooking(true);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please log in as a tenant to book an inspection.");
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
      setBooking(false);
      return;
    }

    setMessage("Inspection request sent! The landlord will confirm soon.");
    setBooking(false);
    setPreferredDate("");
  }

  if (loading) return <p>Loading...</p>;
  if (!listing) return <p>Listing not found.</p>;

  return (
    <div>
      <img src={listing.image_url} alt={listing.title} style={{ maxWidth: "400px" }} />
      <h1>{listing.title}</h1>
      <p>{listing.location}</p>
      <p>{listing.bedrooms} bedroom(s)</p>
      <p><strong>₦{listing.price.toLocaleString()}/year</strong></p>

      <h2>Book an Inspection</h2>
      <form onSubmit={handleBookInspection}>
        <input
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          required
        />
        <button type="submit" disabled={booking}>
          {booking ? "Booking..." : "Request Inspection"}
        </button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}