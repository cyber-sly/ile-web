"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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

      // Fetch this landlord's own listings
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

      // Fetch inspection requests tied to those listings
      const listingIds = listingsData.map((listing) => listing.id);

      if (listingIds.length > 0) {
        const { data: inspectionsData, error: inspectionsError } = await supabase
          .from("inspections")
          .select("*, listings(title)")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });

        if (!inspectionsError) {
          setInspections(inspectionsData);
        }
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

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: "24px" }}>
      <h1>Your Dashboard</h1>

      <h2>Your Listings ({listings.length})</h2>
      {listings.length === 0 ? (
        <p>You haven't posted any listings yet.</p>
      ) : (
        <ul>
          {listings.map((listing) => (
            <li key={listing.id}>
              {listing.title} — {listing.location} — ₦{Number(listing.price).toLocaleString()}/year
            </li>
          ))}
        </ul>
      )}

      <h2>Inspection Requests ({inspections.length})</h2>
      {inspections.length === 0 ? (
        <p>No inspection requests yet.</p>
      ) : (
        <ul>
          {inspections.map((inspection) => (
            <li key={inspection.id} style={{ marginBottom: "12px" }}>
              <strong>{inspection.listings?.title}</strong> — requested for{" "}
              {inspection.preferred_date} — status: <strong>{inspection.status}</strong>
              <div>
                <button onClick={() => updateStatus(inspection.id, "confirmed")}>
                  Confirm
                </button>
                <button onClick={() => updateStatus(inspection.id, "done")}>
                  Mark Done
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}