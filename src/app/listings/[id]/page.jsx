"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  MapPin, BedDouble, CalendarDays, CheckCircle2, AlertCircle, Home as HomeIcon,
  Pencil, Trash2, Sparkles,
} from "lucide-react";

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    async function fetchListing() {
      const [{ data, error }, { data: userData }] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);

      if (!error) setListing(data);
      setCurrentUserId(userData?.user?.id ?? null);
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
      preferred_time: preferredTime || null,
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
    setPreferredTime("");
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this listing? This can't be undone.");
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from("listings").delete().eq("id", id);
    if (!deleteError) router.push("/dashboard");
  }

  if (loading) return <p className="p-6 text-ink/60">Loading...</p>;
  if (!listing) return <p className="p-6 text-ink/60">Listing not found.</p>;

  const images = listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [];
  const videos = listing.video_urls || [];
  const isOwner = currentUserId && currentUserId === listing.landlord_id;

  return (
    <div className="max-w-lg mx-auto p-6">
      {images.length > 0 ? (
        <div>
          <img
            src={images[activeImage]}
            alt={listing.title}
            className="w-full h-64 object-cover rounded-xl"
          />
          {images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 ${
                    i === activeImage ? "border-palm" : "border-transparent"
                  }`}
                >
                  <img src={url} alt="" className="w-16 h-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-64 rounded-xl bg-mist flex items-center justify-center text-ink/30">
          <HomeIcon size={40} />
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <h1 className="font-display text-2xl font-semibold text-ink">{listing.title}</h1>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
            listing.listing_type === "sale" ? "bg-clay/15 text-clay" : "bg-palm/15 text-palm"
          }`}
        >
          {listing.listing_type === "sale" ? "For Sale" : "For Rent"}
        </span>
      </div>

      <p className="flex items-center gap-1.5 text-ink/60 mt-1">
        <MapPin size={16} /> {listing.location}
      </p>
      {listing.address && <p className="text-ink/50 text-sm ml-6">{listing.address}</p>}
      <p className="flex items-center gap-1.5 text-ink/60 mt-1">
        <BedDouble size={16} /> {listing.bedrooms} bedroom(s)
      </p>
      <p className="text-palm font-semibold text-lg mt-2">
        ₦{Number(listing.price).toLocaleString()}
        {listing.listing_type !== "sale" && "/year"}
      </p>

      {isOwner && (
        <div className="flex gap-2 mt-4">
          <Link
            href={`/listings/${id}/edit`}
            className="flex items-center gap-1.5 text-sm bg-mist text-ink px-3 py-1.5 rounded-lg hover:bg-mist/70 transition-colors"
          >
            <Pencil size={14} /> Edit
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm bg-clay text-white px-3 py-1.5 rounded-lg hover:bg-clay/90 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {listing.description && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink mb-2">About this place</h2>
          <p className="text-ink/70 whitespace-pre-line">{listing.description}</p>
        </div>
      )}

      {listing.features?.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink mb-2 flex items-center gap-1.5">
            <Sparkles size={18} className="text-sun" /> Features
          </h2>
          <div className="flex flex-wrap gap-2">
            {listing.features.map((feature) => (
              <span
                key={feature}
                className="text-sm text-ink/70 bg-mist/60 px-3 py-1 rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-ink mb-2">Videos</h2>
          <div className="flex flex-col gap-3">
            {videos.map((url) => (
              <video key={url} src={url} controls className="w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-white border border-mist rounded-xl shadow-sm">
        <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
          <CalendarDays size={18} /> Book an Inspection
        </h2>
        <form onSubmit={handleBookInspection} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
              className="flex-1 min-w-0 border border-mist rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-palm"
            />
            <input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              className="flex-1 min-w-0 border border-mist rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-palm"
            />
          </div>
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
