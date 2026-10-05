"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PropertyCard from "@/components/PropertyCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import { button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { formatNairaShort } from "@/lib/format";
import { MapPin, X, SearchX, SlidersHorizontal } from "lucide-react";

const TYPES = [
  { value: "all", label: "All" },
  { value: "rent", label: "For rent" },
  { value: "sale", label: "For sale" },
];
const BEDS = [0, 1, 2, 3, 4];
const BUDGETS = [0, 500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
const SORTS = [
  { value: "new", label: "Newest" },
  { value: "low", label: "Lowest price" },
  { value: "high", label: "Highest price" },
];

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
        active
          ? "bg-palm text-white"
          : "border border-line-strong bg-surface text-ink-muted hover:border-ink/30 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const selectClass =
  "h-9 cursor-pointer rounded-full border border-line-strong bg-surface pl-3.5 pr-8 text-sm font-semibold text-ink outline-none transition-colors hover:border-ink/30 focus:border-palm focus:ring-2 focus:ring-palm/25";

export default function ListingsPage() {
  return (
    <Suspense fallback={<SkeletonGrid className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 ${GRID}`} />}>
      <ListingsRoute />
    </Suspense>
  );
}

// Remount when the URL changes (e.g. navbar "Rent" -> "Buy") so filters reset to match it.
function ListingsRoute() {
  const searchParams = useSearchParams();
  return <ListingsContent key={searchParams.toString()} searchParams={searchParams} />;
}

function ListingsContent({ searchParams }) {
  const initialType = ["rent", "sale"].includes(searchParams.get("type")) ? searchParams.get("type") : "all";

  const [searchTerm, setSearchTerm] = useState(searchParams.get("location") || "");
  const [type, setType] = useState(initialType);
  const [minBeds, setMinBeds] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
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
    const filtered = listings.filter((l) => {
      const price = Number(l.price) || 0;
      return (
        (!q ||
          l.location?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q)) &&
        (type === "all" || (l.listing_type || "rent") === type) &&
        Number(l.bedrooms || 0) >= minBeds &&
        (!minPrice || price >= minPrice) &&
        (!maxPrice || price <= maxPrice)
      );
    });
    if (sort === "low") filtered.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "high") filtered.sort((a, b) => Number(b.price) - Number(a.price));
    return filtered;
  }, [listings, searchTerm, type, minBeds, minPrice, maxPrice, sort]);

  const activeFilters = [type !== "all", minBeds > 0, minPrice > 0, maxPrice > 0].filter(Boolean).length;
  const hasFilters = searchTerm.trim() !== "" || activeFilters > 0;

  function clearAll() {
    setSearchTerm("");
    setType("all");
    setMinBeds(0);
    setMinPrice(0);
    setMaxPrice(0);
  }

  const place = searchTerm.trim();
  const heading =
    (type === "rent" ? "Homes for rent" : type === "sale" ? "Property for sale" : "Property") +
    (place ? ` in ${place.replace(/\b\w/g, (c) => c.toUpperCase())}` : " across Nigeria");

  return (
    <div>
      {/* Header + search */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 md:pt-12">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">{heading}</h1>
          <div className="relative mt-5 max-w-2xl">
            <MapPin
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-palm"
            />
            <input
              type="search"
              aria-label="Search by area, city or title"
              placeholder="Search by area, city or title"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-11 pr-11 text-base text-ink outline-none placeholder:text-ink-muted/80 focus:border-palm focus:ring-2 focus:ring-palm/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink"
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters stay pinned under the navbar */}
      <div className="sticky top-16 z-30 border-b border-line bg-cream/90 backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          <SlidersHorizontal size={17} className="shrink-0 text-ink-muted" aria-hidden="true" />
          <div className="flex gap-2" role="group" aria-label="Listing type">
            {TYPES.map((t) => (
              <Chip key={t.value} active={type === t.value} onClick={() => setType(t.value)}>
                {t.label}
              </Chip>
            ))}
          </div>

          <span className="mx-1 h-6 w-px shrink-0 bg-line-strong" aria-hidden="true" />

          <label className="shrink-0">
            <span className="sr-only">Minimum price</span>
            <select value={minPrice} onChange={(e) => setMinPrice(Number(e.target.value))} className={selectClass}>
              {BUDGETS.map((b) => (
                <option key={b} value={b}>
                  {b ? `Min ${formatNairaShort(b)}` : "Min price"}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className="sr-only">Maximum price</span>
            <select value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className={selectClass}>
              {BUDGETS.map((b) => (
                <option key={b} value={b}>
                  {b ? `Max ${formatNairaShort(b)}` : "Max price"}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className="sr-only">Bedrooms</span>
            <select value={minBeds} onChange={(e) => setMinBeds(Number(e.target.value))} className={selectClass}>
              {BEDS.map((b) => (
                <option key={b} value={b}>
                  {b ? `${b}+ beds` : "Any beds"}
                </option>
              ))}
            </select>
          </label>

          <label className="ml-auto shrink-0 pl-2">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading ? (
          <SkeletonGrid className={GRID} />
        ) : results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches yet"
            action={
              hasFilters && (
                <button type="button" onClick={clearAll} className={button()}>
                  Clear all filters
                </button>
              )
            }
          >
            {place ? `We couldn't find anything for "${place}" with these filters.` : "Try widening your budget or filters."}
          </EmptyState>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink-muted" aria-live="polite">
                {results.length} {results.length === 1 ? "property" : "properties"}
              </p>
              {hasFilters && (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-palm hover:underline">
                  Clear filters
                </button>
              )}
            </div>
            <div className={GRID}>
              {results.map((listing, i) => (
                <PropertyCard key={listing.id} listing={listing} priority={i < 3} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
