"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import HomeHero from "@/components/HomeHero";
import PropertyCard from "@/components/PropertyCard";
import { SkeletonGrid } from "@/components/SkeletonCard";
import EmptyState from "@/components/ui/EmptyState";
import { button } from "@/components/ui/Button";
import {
  ArrowRight, Search, CalendarCheck, KeyRound, Home as HomeIcon, Wallet, ShieldCheck, Eye,
} from "lucide-react";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4";

const CATEGORIES = [
  {
    href: "/listings",
    title: "Homes for rent",
    blurb: "Flats, self-contains and duplexes.",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=70",
  },
  {
    href: "/listings?tab=sale",
    title: "Homes for sale",
    blurb: "Own your home, with the asking price upfront.",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=70",
  },
  {
    href: "/listings?tab=land",
    title: "Land",
    blurb: "Plots and farmland, with the title document shown.",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=70",
  },
  {
    href: "/listings?tab=commercial",
    title: "Shops and offices",
    blurb: "Space to run your business.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=70",
  },
];

const STEPS = [
  { icon: Search, title: "Search for free", body: "Filter by area, budget and bedrooms. No search fee, ever." },
  { icon: CalendarCheck, title: "Book a viewing", body: "Pick a time online. Viewings are free, with no inspection fee." },
  { icon: KeyRound, title: "Move in", body: "Agree terms with the lister and pay them directly." },
];

export default function Home() {
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!error) setLatest(data);
      setLoading(false);
    }
    fetchLatest();
  }, []);

  return (
    <div>
      <HomeHero />

      {/* Promises the product actually keeps today. */}
      <section aria-label="Why Ile" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wallet, text: "Free to search, save and view" },
            { icon: ShieldCheck, text: "No inspection or search fees" },
            { icon: Eye, text: "Prices shown upfront on every listing" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm font-semibold text-ink">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-palm-soft text-palm">
                <Icon size={19} aria-hidden="true" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* Latest listings */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">Fresh on Ile</h2>
            <p className="mt-1 text-ink-muted">The newest homes and property listed across Nigeria.</p>
          </div>
          <Link href="/listings" className="hidden shrink-0 items-center gap-1 font-semibold text-palm hover:underline sm:flex">
            See all <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <SkeletonGrid count={4} className={GRID} />
        ) : latest.length === 0 ? (
          <EmptyState
            icon={HomeIcon}
            title="No listings yet"
            action={
              <Link href="/signup?role=landlord&next=/listings/new" className={button()}>
                List the first property
              </Link>
            }
          >
            Be the first to list a property on Ile. It&apos;s free.
          </EmptyState>
        ) : (
          <div className={GRID}>
            {latest.map((listing, i) => (
              <PropertyCard key={listing.id} listing={listing} priority={i < 4} />
            ))}
          </div>
        )}

        <Link href="/listings" className={button({ variant: "neutral", full: true, className: "mt-6 sm:hidden" })}>
          See all listings
        </Link>
      </section>

      {/* Browse by category */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">What are you looking for?</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group relative isolate flex min-h-[240px] flex-col justify-end overflow-hidden rounded-[var(--radius-hero)] p-5 text-white"
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0F1C15]/85 via-[#0F1C15]/30 to-transparent" />
              <h3 className="font-serif text-2xl font-semibold">{c.title}</h3>
              <p className="mt-1 max-w-sm text-white/85">{c.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-semibold">
                Browse <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="rounded-[var(--radius-hero)] border border-line bg-surface px-6 py-12 md:px-12">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            How Ile works
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-palm text-white">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Step {i + 1}</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Lister call to action */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-8 overflow-hidden rounded-[var(--radius-hero)] bg-palm-dark text-white md:grid-cols-2">
          <div className="px-6 py-12 md:px-12">
            <p className="text-sm font-bold uppercase tracking-wider text-gold">For owners and agents</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Have a property to let or sell?
            </h2>
            <p className="mt-3 max-w-md text-white/80">
              List it free in a few minutes. Serious home-seekers book viewings straight from your
              listing, and you manage every request in one dashboard.
            </p>
            <Link
              href="/signup?role=landlord&next=/listings/new"
              className={button({ variant: "onDark", size: "lg", className: "mt-7" })}
            >
              List your property free <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70"
            alt=""
            loading="lazy"
            className="hidden h-full min-h-[340px] w-full object-cover md:block"
          />
        </div>
      </section>
    </div>
  );
}
