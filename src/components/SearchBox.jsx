"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { SEARCH_TABS } from "@/lib/search";

// Tabbed property search used on the homepage hero.
export default function SearchBox({ className = "" }) {
  const router = useRouter();
  const [tab, setTab] = useState("rent");
  const [q, setQ] = useState("");

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams({ tab });
    if (q.trim()) params.set("q", q.trim());
    router.push(`/listings?${params}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-float)] ${className}`}
    >
      <div role="tablist" aria-label="What are you looking for?" className="flex border-b border-line">
        {SEARCH_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors sm:flex-none sm:px-7 ${
              tab === t.value
                ? "text-palm shadow-[inset_0_-2px_0_var(--color-palm)]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 p-2.5 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Location</span>
          <MapPin
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-palm"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="State, LGA or area, e.g. Lekki, Wuse, Bodija"
            className="h-12 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pl-10 pr-3 text-base text-ink outline-none placeholder:text-ink-muted/80 focus:border-palm focus:ring-2 focus:ring-palm/25"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-palm px-7 font-semibold text-white transition-colors hover:bg-palm-dark"
        >
          <Search size={18} aria-hidden="true" /> Search
        </button>
      </div>
    </form>
  );
}
