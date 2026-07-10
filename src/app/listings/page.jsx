"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/lib/supabaseClient";

export default function ListingsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setListings(data);
      }
      setLoading(false);
    }

    fetchListings();
  }, []);

  const filteredListings = listings.filter((listing) =>
    listing.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p>Loading listings...</p>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search by location..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ padding: "8px", marginBottom: "16px", width: "260px" }}
      />
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {filteredListings.length === 0 ? (
          <p>No listings found for "{searchTerm}".</p>
        ) : (
          filteredListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <PropertyCard
                title={listing.title}
                location={listing.location}
                price={listing.price}
                bedrooms={listing.bedrooms}
                imageUrl={listing.image_url}
              />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}