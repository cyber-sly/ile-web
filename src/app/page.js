"use client";

import { useState, useEffect } from "react";
import { fetchLatestListings } from "@shared/search.js";
import Link from "next/link";
import Image from "next/image";
import rentPhoto from "@/assets/home/rent.webp";
import salePhoto from "@/assets/home/sale.webp";
import landPhoto from "@/assets/home/land.webp";
import commercialPhoto from "@/assets/home/commercial.webp";
import listerPhoto from "@/assets/home/lister.webp";
import { supabase } from "@/lib/supabaseClient";
import HomeHero from "@/components/HomeHero";
import AccountDeletedNotice from "@/components/AccountDeletedNotice";
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
    image: rentPhoto,
  },
  {
    href: "/listings?tab=sale",
    title: "Homes for sale",
    blurb: "Own your home, with the asking price upfront.",
    image: salePhoto,
  },
  {
    href: "/listings?tab=land",
    title: "Land",
    blurb: "Plots and farmland, with the title document shown.",
    image: landPhoto,
  },
  {
    href: "/listings?tab=commercial",
    title: "Shops and offices",
    blurb: "Space to run your business.",
    image: commercialPhoto,
  },
];

const STEPS = [
  { icon: Search, title: "Search for free", body: "Filter by area, budget and bedrooms. No search fee, ever." },
  { icon: CalendarCheck, title: "Fix a booking", body: "Pick a time online. Booking on Ile is free." },
  { icon: KeyRound, title: "Move in", body: "Agree terms with the lister and pay them directly." },
];

export default function Home() {
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatest() {
      try {
        setLatest(await fetchLatestListings(supabase));
      } catch {
        // Keep the empty list; the section shows its empty state.
      }
      setLoading(false);
    }
    fetchLatest();
  }, []);

  return (
    <div>
      <AccountDeletedNotice />
      <HomeHero />

      {/* Promises the product actually keeps today. */}
      <section aria-label="Why Ile" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wallet, text: "Free to search, save and book" },
            { icon: ShieldCheck, text: "Listings from all 36 states and Abuja" },
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
          <div className={`${GRID} stagger-in`}>
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
              <Image
                src={c.image}
                alt=""
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="-z-20 object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0E1526]/85 via-[#0E1526]/30 to-transparent" />
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
              List it free in a few minutes. Serious home-seekers make bookings straight from your
              listing, and you manage every request in one dashboard.
            </p>
            <Link
              href="/signup?role=landlord&next=/listings/new"
              className={button({ variant: "onDark", size: "lg", className: "mt-7" })}
            >
              List your property free <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="relative hidden h-full min-h-[340px] md:block">
            <Image src={listerPhoto} alt="" fill placeholder="blur" sizes="(min-width: 1280px) 640px, 50vw" className="object-cover" />
          </div>
        </div>
      </section>
    </div>
  );
}
