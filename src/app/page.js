"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import PropertyCard from "@/components/PropertyCard";
import SkeletonCard from "@/components/SkeletonCard";
import Reveal from "@/components/Reveal";
import {
  Search, ShieldCheck, Home as HomeIcon, Wallet, ArrowRight, MapPin,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      if (!error) setFeatured(data);
      setLoadingFeatured(false);
    }

    fetchFeatured();
  }, []);

  function handleHeroSearch(e) {
    e.preventDefault();
    router.push(`/listings?location=${encodeURIComponent(heroSearch)}`);
  }

  return (
    <div>
      {/* Hero with background photo */}
      <section className="relative h-[560px] flex items-center justify-center text-center">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=70"
          alt="A modern Nigerian home"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/50 to-ink/70" />

        <div className="relative z-10 px-6 max-w-2xl animate-fade-up">
          <span className="inline-block text-sm font-medium text-white bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-4">
            Built for Nigerian renters
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-white leading-[1.05]">
            Find a home without the wahala.
          </h1>
          <p className="mt-5 text-lg text-white/85 max-w-md mx-auto">
            Search and inspect for free. Pay only when you're ready to move in.
          </p>
        </div>

        <form
          onSubmit={handleHeroSearch}
          className="absolute -bottom-8 z-20 bg-white rounded-xl shadow-xl border border-mist p-2 flex items-center gap-2 w-[90%] max-w-md animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <MapPin className="text-ink/40 ml-2" size={20} />
          <input
            type="text"
            placeholder="Search by location (e.g. Yaba, Lekki)"
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            className="flex-1 outline-none text-ink py-2"
          />
          <button
            type="submit"
            className="bg-palm text-white px-4 py-2 rounded-lg font-medium hover:bg-palm-dark transition-colors flex items-center gap-1.5"
          >
            <Search size={16} /> Search
          </button>
        </form>
      </section>

      {/* Featured Listings */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <Reveal>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-semibold text-ink">Featured Listings</h2>
            <Link href="/listings" className="text-palm font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>

        {loadingFeatured ? (
          <div className="grid grid-cols-4 gap-2 md:flex md:gap-4 md:flex-wrap">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <Reveal>
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-mist rounded-xl">
              <HomeIcon className="text-ink/30" size={32} />
              <p className="text-ink/60">
                No listings posted yet.{" "}
                <Link href="/listings/new" className="text-palm underline">
                  Be the first to list a property
                </Link>
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-4 gap-2 md:flex md:gap-4 md:flex-wrap">
            {featured.map((listing, i) => (
              <Reveal key={listing.id} delay={i * 120}>
                <Link href={`/listings/${listing.id}`} className="no-underline text-inherit">
                  <PropertyCard
                    title={listing.title}
                    location={listing.location}
                    price={listing.price}
                    bedrooms={listing.bedrooms}
                    imageUrl={listing.image_url}
                  />
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Wave divider */}
      <svg viewBox="0 0 1200 60" className="w-full h-10 text-palm/20" preserveAspectRatio="none">
        <path
          d="M0,30 C150,60 350,0 600,30 C850,60 1050,0 1200,30 L1200,60 L0,60 Z"
          fill="currentColor"
        />
      </svg>

      {/* Journey */}
      <section className="bg-mist/30 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold text-center text-ink mb-12">
              Three steps. No middleman toll.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            <Reveal delay={0}>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-palm/10 flex items-center justify-center mb-4">
                  <Search className="text-palm" size={26} />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">Search</h3>
                <p className="text-ink/70">
                  Filter by location and budget. Every listing is free to browse — no
                  search fee, ever.
                </p>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-sun/15 flex items-center justify-center mb-4">
                  <HomeIcon className="text-sun" size={26} />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">Inspect</h3>
                <p className="text-ink/70">
                  Book a physical inspection only for homes you've already shortlisted
                  — one clear fee, shown upfront.
                </p>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-clay/15 flex items-center justify-center mb-4">
                  <Wallet className="text-clay" size={26} />
                </div>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">Move in</h3>
                <p className="text-ink/70">
                  Pay the landlord directly. No ghost agents, no stacked commissions.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-8">
        <Reveal>
          <div className="flex gap-4">
            <ShieldCheck className="text-palm shrink-0" size={28} />
            <div>
              <h3 className="font-display text-lg font-semibold text-ink mb-1">
                Nothing to pay until you're ready
              </h3>
              <p className="text-ink/70">
                Search and shortlist for free. You only pay once you book a real
                inspection or sign a lease.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="flex gap-4">
            <HomeIcon className="text-palm shrink-0" size={28} />
            <div>
              <h3 className="font-display text-lg font-semibold text-ink mb-1">
                Landlords list directly
              </h3>
              <p className="text-ink/70">
                No agent required to reach real, verified tenants — post a listing in
                minutes.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Bottom CTA banner with photo */}
      <section className="relative py-24 px-6 text-center">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=70"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/70" />
        <Reveal className="relative z-10 max-w-xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-white mb-4">
            Ready to find your next home?
          </h2>
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 bg-palm text-white px-6 py-3 rounded-lg font-medium hover:bg-palm-dark transition-colors"
          >
            Browse Listings <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>
    </div>
  );
}