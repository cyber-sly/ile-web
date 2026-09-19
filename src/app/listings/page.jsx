"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import SkeletonCard from "@/components/SkeletonCard";
import Reveal from "@/components/Reveal";
import { supabase } from "@/lib/supabaseClient";
import { MapPin, X, HomeIcon, ArrowUpDown, BedDouble } from "lucide-react";

const TYPES = [
  { value: "all", label: "All" },
  { value: "rent", label: "For Rent" },
  { value: "sale", label: "For Sale" },
];
const BEDS = [
  { value: 0, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
];
const SORTS = [
  { value: "new", label: "Newest first" },
  { value: "low", label: "Price: low to high" },
  { value: "high", label: "Price: high to low" },
];

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
const BANNER_IMAGE =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=2000&q=75";
const TEXT_SHADOW = { textShadow: "0 2px 28px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.55)" };

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-palm text-white shadow-sm shadow-palm/30"
          : "bg-white text-ink/70 ring-1 ring-mist hover:text-ink hover:ring-ink/25"
      }`}
    >
      {children}
    </button>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className={`mx-auto max-w-6xl px-6 py-10 ${GRID}`}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} variant="roomy" />
          ))}
        </div>
      }
    >
      <ListingsContent />
    </Suspense>
  );
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const initialLocation = searchParams.get("location") || "";

  const [searchTerm, setSearchTerm] = useState(initialLocation);
  const [type, setType] = useState("all");
  const [minBeds, setMinBeds] = useState(0);
  const [sort, setSort] = useState("new");
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

  const results = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = listings.filter(
      (l) =>
        (!q || l.location?.toLowerCase().includes(q) || l.title?.toLowerCase().includes(q)) &&
        (type === "all" || (l.listing_type || "rent") === type) &&
        Number(l.bedrooms || 0) >= minBeds,
    );
    if (sort === "low") filtered.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "high") filtered.sort((a, b) => Number(b.price) - Number(a.price));
    return filtered; // "new" keeps the server's created_at order
  }, [listings, searchTerm, type, minBeds, sort]);

  const hasFilters = searchTerm.trim() !== "" || type !== "all" || minBeds !== 0;

  function clearAll() {
    setSearchTerm("");
    setType("all");
    setMinBeds(0);
  }

  return (
    <div>
      {/* Header + search */}
      <section className="relative isolate overflow-hidden border-b border-mist bg-ink">
        <img
          src={BANNER_IMAGE}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_45%]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/60 via-ink/50 to-ink/70" />
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-16 md:pb-20 md:pt-24">
          <h1
            style={TEXT_SHADOW}
            className="animate-fade-up font-display text-4xl font-bold text-white md:text-6xl"
          >
            Find your next home
          </h1>
          <p
            style={{ ...TEXT_SHADOW, animationDelay: "120ms" }}
            className="animate-fade-up mt-4 max-w-xl text-lg font-medium text-white md:text-xl"
          >
            Browse verified homes across Nigeria. Search and shortlist for free.
          </p>

          <div
            className="animate-fade-up relative mt-8 max-w-xl"
            style={{ animationDelay: "240ms" }}
          >
            <MapPin
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-palm"
              size={20}
            />
            <input
              type="text"
              aria-label="Search by location or title"
              placeholder="Search by location (e.g. Yaba, Lekki)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-mist bg-white py-3.5 pl-12 pr-12 text-ink shadow-lg shadow-ink/5 outline-none transition-shadow placeholder:text-ink/40 focus:ring-2 focus:ring-palm"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters: stay pinned under the navbar while scrolling */}
      <div className="sticky top-[65px] z-30 border-b border-mist bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Listing type">
            {TYPES.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                {t.label}
              </Chip>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Bedrooms">
            <BedDouble size={16} className="shrink-0 text-ink/40" />
            {BEDS.map((b) => (
              <Chip key={b.value} active={minBeds === b.value} onClick={() => setMinBeds(b.value)}>
                {b.label}
              </Chip>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 text-sm text-ink/70">
            <ArrowUpDown size={16} className="text-ink/40" />
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer rounded-full bg-white py-1.5 pl-3 pr-2 text-sm font-medium text-ink ring-1 ring-mist outline-none transition hover:ring-ink/25 focus:ring-2 focus:ring-palm"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <div className={GRID}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} variant="roomy" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-mist bg-white/60 px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-palm/10">
              <HomeIcon className="text-palm" size={28} />
            </span>
            <div>
              <p className="font-display text-xl font-semibold text-ink">No homes match yet</p>
              <p className="mt-1 text-ink/60">
                {searchTerm.trim()
                  ? `Nothing found for "${searchTerm.trim()}" with these filters.`
                  : "Try widening your filters."}
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-full bg-palm px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-palm-dark"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm font-medium text-ink/60" aria-live="polite">
              {results.length} {results.length === 1 ? "home" : "homes"}
              {searchTerm.trim() && (
                <>
                  {" "}
                  matching <span className="text-ink">&ldquo;{searchTerm.trim()}&rdquo;</span>
                </>
              )}
            </p>
            <div className={GRID}>
              {results.map((listing, i) => (
                <Reveal key={listing.id} delay={(i % 3) * 90}>
                  <Link
                    href={`/listings/${listing.id}`}
                    className="block h-full rounded-2xl no-underline text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palm"
                  >
                    <PropertyCard
                      variant="roomy"
                      title={listing.title}
                      location={listing.location}
                      price={listing.price}
                      bedrooms={listing.bedrooms}
                      imageUrl={listing.image_url}
                      listingType={listing.listing_type}
                    />
                  </Link>
                </Reveal>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
