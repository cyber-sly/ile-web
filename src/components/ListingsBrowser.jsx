"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PropertyCard from "@/components/PropertyCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { formatNairaShort } from "@/lib/format";
import { NIGERIA, STATES, stateLabel } from "@/lib/nigeria";
import { PROPERTY_TYPES, TITLE_DOCUMENTS } from "@/lib/property";
import { SEARCH_TABS, SORTS, PAGE_SIZE, readFilters, nextParams, buildQuery } from "@/lib/search";
import { MapPin, X, SearchX, SlidersHorizontal } from "lucide-react";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";
const BEDS = [1, 2, 3, 4, 5];
const BUDGETS = {
  rent: [200_000, 500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000],
  default: [1_000_000, 5_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000],
};

const selectClass =
  "h-9 max-w-[11rem] cursor-pointer rounded-full border border-line-strong bg-surface pl-3.5 pr-8 text-sm font-semibold text-ink outline-none transition-colors hover:border-ink/30 focus:border-palm focus:ring-2 focus:ring-palm/25";

function FilterSelect({ label, value, onChange, placeholder, options }) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={<SkeletonGrid className={`mx-auto max-w-7xl px-4 py-10 sm:px-6 ${GRID}`} />}>
      <ListingsContent />
    </Suspense>
  );
}

function ListingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramKey = searchParams.toString();
  const f = useMemo(() => readFilters(new URLSearchParams(paramKey)), [paramKey]);

  // Results are tagged with the params they were fetched for, so stale
  // responses from a previous filter never overwrite newer ones.
  const [result, setResult] = useState({ key: null, items: [], count: 0, page: 0, error: "" });
  const [loadingMore, setLoadingMore] = useState(false);
  // The search box is typed into locally and pushed to the URL after a pause;
  // when the URL's q changes elsewhere (clear, back button), the box follows it.
  const [q, setQ] = useState(f.q);
  const [syncedQ, setSyncedQ] = useState(f.q);
  if (f.q !== syncedQ) {
    setSyncedQ(f.q);
    setQ(f.q);
  }

  useEffect(() => {
    let cancelled = false;
    buildQuery(f, 0).then(({ data, count, error }) => {
      if (cancelled) return;
      setResult({ key: paramKey, items: data || [], count: count || 0, page: 0, error: error?.message || "" });
    });
    return () => {
      cancelled = true;
    };
  }, [f, paramKey]);

  function update(changes) {
    const params = nextParams(f, changes);
    router.replace(params.toString() ? `/listings?${params}` : "/listings", { scroll: false });
  }

  // Debounce typing in the search box into the URL.
  useEffect(() => {
    if (q.trim() === f.q) return;
    const t = setTimeout(() => update({ q: q.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function loadMore() {
    setLoadingMore(true);
    const page = result.page + 1;
    const { data, error } = await buildQuery(f, page);
    setLoadingMore(false);
    if (error) return setResult((r) => ({ ...r, error: error.message }));
    setResult((r) => ({ ...r, items: [...r.items, ...(data || [])], page }));
  }

  const loading = result.key !== paramKey;
  const isHomesTab = f.tab === "rent" || f.tab === "sale";
  const tabCategory = isHomesTab ? "homes" : f.tab;
  const typeOptions = PROPERTY_TYPES.filter((t) => t.category === tabCategory);
  const budgets = f.tab === "rent" || f.purpose === "rent" ? BUDGETS.rent : BUDGETS.default;
  const activeFilters = ["state", "lga", "ptype", "purpose", "min", "max", "beds", "title"].filter((k) => f[k]).length;
  const hasFilters = activeFilters > 0 || f.q;

  const tabInfo = SEARCH_TABS.find((t) => t.value === f.tab);
  const where = f.lga ? `${f.lga}, ${stateLabel(f.state)}` : f.state ? stateLabel(f.state) : f.q ? `"${f.q}"` : "Nigeria";
  const heading = `${tabInfo.heading} ${f.q && !f.state ? "matching" : "in"} ${where}`;

  function clearAll() {
    setQ("");
    router.replace(f.tab === "rent" ? "/listings" : `/listings?tab=${f.tab}`, { scroll: false });
  }

  return (
    <div>
      {/* Header: tabs + search */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 md:pt-12">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">{heading}</h1>
          <div className="relative mt-5 max-w-2xl">
            <MapPin size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-palm" />
            <input
              type="search"
              aria-label="Search by area, LGA, state or title"
              placeholder="Search by area, LGA, state or title"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-12 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-11 pr-11 text-base text-ink outline-none placeholder:text-ink-muted/80 focus:border-palm focus:ring-2 focus:ring-palm/25 [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQ("");
                  update({ q: "" });
                }}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink"
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
          <div role="tablist" aria-label="Property category" className="no-scrollbar mt-6 flex gap-1 overflow-x-auto">
            {SEARCH_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={f.tab === t.value}
                onClick={() => update({ tab: t.value })}
                className={`whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                  f.tab === t.value ? "text-palm shadow-[inset_0_-2px_0_var(--color-palm)]" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Filters stay pinned under the navbar */}
      <div className="sticky top-16 z-30 border-b border-line bg-cream/90 backdrop-blur-xl">
        <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:flex-wrap lg:overflow-visible">
          <SlidersHorizontal size={17} className="shrink-0 text-ink-muted" aria-hidden="true" />
          <FilterSelect
            label="State"
            value={f.state}
            onChange={(v) => update({ state: v })}
            placeholder="All states"
            options={STATES.map((s) => ({ value: s, label: stateLabel(s) }))}
          />
          {f.state && (
            <FilterSelect
              label="LGA"
              value={f.lga}
              onChange={(v) => update({ lga: v })}
              placeholder="All LGAs"
              options={(NIGERIA[f.state] || []).map((l) => ({ value: l, label: l }))}
            />
          )}
          {!isHomesTab && (
            <FilterSelect
              label="Rent or buy"
              value={f.purpose}
              onChange={(v) => update({ purpose: v })}
              placeholder="Rent or buy"
              options={[
                { value: "sale", label: "For sale" },
                { value: "rent", label: "For rent / lease" },
              ]}
            />
          )}
          <FilterSelect
            label="Property type"
            value={f.ptype}
            onChange={(v) => update({ ptype: v })}
            placeholder="Any type"
            options={typeOptions}
          />
          {isHomesTab && (
            <FilterSelect
              label="Bedrooms"
              value={f.beds}
              onChange={(v) => update({ beds: v })}
              placeholder="Any beds"
              options={BEDS.map((b) => ({ value: String(b), label: `${b}+ beds` }))}
            />
          )}
          {f.tab === "land" && (
            <FilterSelect
              label="Title document"
              value={f.title}
              onChange={(v) => update({ title: v })}
              placeholder="Any title"
              options={TITLE_DOCUMENTS.map((t) => ({ value: t.value, label: t.short }))}
            />
          )}
          <FilterSelect
            label="Minimum price"
            value={f.min}
            onChange={(v) => update({ min: v })}
            placeholder="Min price"
            options={budgets.map((b) => ({ value: String(b), label: `Min ${formatNairaShort(b)}` }))}
          />
          <FilterSelect
            label="Maximum price"
            value={f.max}
            onChange={(v) => update({ max: v })}
            placeholder="Max price"
            options={budgets.map((b) => ({ value: String(b), label: `Max ${formatNairaShort(b)}` }))}
          />
          <div className="ml-auto shrink-0 pl-2">
            <label>
              <span className="sr-only">Sort by</span>
              <select value={f.sort || "new"} onChange={(e) => update({ sort: e.target.value === "new" ? "" : e.target.value })} className={selectClass}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {result.error && <Alert className="mb-6">{result.error}</Alert>}
        {loading ? (
          <SkeletonGrid className={GRID} />
        ) : result.items.length === 0 ? (
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
            Try another area, widen your budget, or remove a filter.
          </EmptyState>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink-muted" aria-live="polite">
                {result.count.toLocaleString()} {result.count === 1 ? "property" : "properties"}
              </p>
              {hasFilters && (
                <button type="button" onClick={clearAll} className="text-sm font-semibold text-palm hover:underline">
                  Clear filters
                </button>
              )}
            </div>
            <div className={GRID}>
              {result.items.map((listing, i) => (
                <PropertyCard key={listing.id} listing={listing} priority={i < 3} />
              ))}
            </div>
            {result.items.length < result.count && (
              <div className="mt-10 flex flex-col items-center gap-2">
                <button type="button" onClick={loadMore} disabled={loadingMore} className={button({ variant: "neutral", size: "lg" })}>
                  {loadingMore ? "Loading…" : `Show ${Math.min(PAGE_SIZE, result.count - result.items.length)} more`}
                </button>
                <p className="text-sm text-ink-muted">
                  Showing {result.items.length} of {result.count.toLocaleString()}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
