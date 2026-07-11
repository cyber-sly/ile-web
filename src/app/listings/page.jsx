"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/lib/supabaseClient";
import { Search, HomeIcon } from "lucide-react";

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

      if (!error) setListings(data);
      setLoading(false);
    }

    fetchListings();
  }, []);

  const filteredListings = listings.filter((listing) =>
    listing.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p className="p-6 text-ink/60">Loading listings...</p>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="font-display text-3xl font-semibold text-ink mb-6">Browse Listings</h1>

      <div className="relative w-72 mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
        <input
          type="text"
          placeholder="Search by location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-mist rounded-lg pl-10 pr-3 py-2 w-full text-ink focus:outline-none focus:ring-2 focus:ring-palm"
        />
      </div>

      <div className="flex gap-4 flex-wrap">
        {filteredListings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 w-full text-center">
            <HomeIcon className="text-ink/30" size={40} />
            <p className="text-ink/60">No listings found for "{searchTerm}".</p>
          </div>
        ) : (
          filteredListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="no-underline text-inherit"
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