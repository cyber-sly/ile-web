"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { LayoutDashboard, Pencil, Trash2, CalendarDays, Inbox } from "lucide-react";

export default function DashboardPage() {
  const [listings, setListings] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please log in as a landlord to view your dashboard.");
        setLoading(false);
        return;
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("landlord_id", user.id)
        .order("created_at", { ascending: false });

      if (listingsError) {
        setError(listingsError.message);
        setLoading(false);
        return;
      }

      setListings(listingsData);

      const listingIds = listingsData.map((listing) => listing.id);

      if (listingIds.length > 0) {
        const { data: inspectionsData, error: inspectionsError } = await supabase
          .from("inspections")
          .select("*, listings(title)")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

        if (!inspectionsError) setInspections(inspectionsData);
      }

      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  async function updateStatus(inspectionId, newStatus) {
    const { error: updateError } = await supabase
      .from("inspections")
      .update({ status: newStatus })
      .eq("id", inspectionId);

    if (!updateError) {
      setInspections((prev) =>
        prev.map((inspection) =>
          inspection.id === inspectionId ? { ...inspection, status: newStatus } : inspection
        )
      );
    }
  }

  async function deleteListing(listingId) {
    const confirmed = window.confirm("Delete this listing? This can't be undone.");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (!deleteError) {
      setListings((prev) => prev.filter((listing) => listing.id !== listingId));
    }
  }

  if (loading) return <p className="p-6 text-ink/60">Loading dashboard...</p>;
  if (error) return <p className="p-6 text-clay">{error}</p>;

  const statusColors = {
    pending: "bg-sun/20 text-sun",
    confirmed: "bg-palm/15 text-palm",
    done: "bg-mist text-ink/60",
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="font-display text-2xl font-semibold text-ink mb-6 flex items-center gap-2">
        <LayoutDashboard className="text-palm" size={26} /> Your Dashboard
      </h1>

      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-ink mb-3">
          Your Listings ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center border border-dashed border-mist rounded-xl">
            <Inbox className="text-ink/30" size={28} />
            <p className="text-ink/60">You haven't posted any listings yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="p-3 bg-white border border-mist rounded-lg text-ink/80 flex items-center justify-between"
              >
                <span>
                  <span className="font-medium text-ink">{listing.title}</span> —{" "}
                  {listing.location} — ₦{Number(listing.price).toLocaleString()}/year
                </span>
                <span className="flex gap-2">
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className="flex items-center gap-1 text-sm bg-mist text-ink px-3 py-1 rounded-lg hover:bg-mist/70 transition-colors"
                  >
                    <Pencil size={14} /> Edit
                  </Link>
                  <button
                    onClick={() => deleteListing(listing.id)}
                    className="flex items-center gap-1 text-sm bg-clay text-white px-3 py-1 rounded-lg hover:bg-clay/90 transition-colors"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-ink mb-3">
          Inspection Requests ({inspections.length})
        </h2>
        {inspections.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center border border-dashed border-mist rounded-xl">
            <CalendarDays className="text-ink/30" size={28} />
            <p className="text-ink/60">No inspection requests yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {inspections.map((inspection) => (
              <li key={inspection.id} className="p-4 bg-white border border-mist rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-ink">{inspection.listings?.title}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[inspection.status]}`}
                  >
                    {inspection.status}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-ink/60 text-sm mb-3">
                  <CalendarDays size={14} /> Requested for {inspection.preferred_date}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(inspection.id, "confirmed")}
                    className="text-sm bg-palm text-white px-3 py-1 rounded-lg hover:bg-palm-dark transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(inspection.id, "done")}
                    className="text-sm bg-mist text-ink px-3 py-1 rounded-lg hover:bg-mist/70 transition-colors"
                  >
                    Mark Done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}