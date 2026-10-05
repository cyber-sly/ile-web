"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useSavedIds } from "@/lib/saved";
import PropertyCard from "@/components/PropertyCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import { button } from "@/components/ui/Button";
import { Heart } from "lucide-react";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export default function SavedPage() {
  const savedIds = useSavedIds();
  const idKey = savedIds.join(",");
  const [listings, setListings] = useState([]);
  const [loadedKey, setLoadedKey] = useState(null);

  useEffect(() => {
    if (!idKey) return;
    supabase
      .from("listings")
      .select("*")
      .in("id", idKey.split(","))
      .then(({ data }) => {
        setListings(data || []);
        setLoadedKey(idKey);
      });
  }, [idKey]);

  // Unsaving on this page removes the card straight away, before any refetch.
  const visible = listings.filter((l) => savedIds.includes(String(l.id)));
  const loading = idKey !== "" && loadedKey === null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">Saved homes</h1>
      <p className="mt-2 text-ink-muted">
        Tap the heart on any listing to keep it here. Saved homes stay on this device.
      </p>

      <div className="mt-8">
        {loading ? (
          <SkeletonGrid count={3} className={GRID} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            action={
              <Link href="/listings" className={button()}>
                Start browsing
              </Link>
            }
          >
            Save the places you like so you can compare them and book viewings later.
          </EmptyState>
        ) : (
          <div className={GRID}>
            {visible.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
