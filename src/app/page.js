import Link from "next/link";
import { Search, ShieldCheck, Home as HomeIcon, Wallet, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block text-sm font-medium text-palm bg-palm/10 px-3 py-1 rounded-full mb-4">
            Built for Nigerian renters
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] text-ink">
            Find a home without the wahala.
          </h1>
          <p className="mt-5 text-lg text-ink/70 max-w-md">
            Search, inspect, and move in — without paying an agent before you've
            even seen a house. No ghosting, no surprise fees.
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 bg-palm text-white px-5 py-3 rounded-lg font-medium hover:bg-palm-dark transition-colors"
            >
              Browse Listings <ArrowRight size={18} />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 border border-mist px-5 py-3 rounded-lg font-medium text-ink hover:bg-mist/40 transition-colors"
            >
              List a Property
            </Link>
          </div>
        </div>

        {/* Stacked photo signature element */}
        <div className="relative h-80 hidden md:block">
          <div className="absolute top-0 left-8 w-56 rotate-[-6deg] shadow-xl rounded-xl overflow-hidden border-4 border-white">
            <img src="https://placehold.co/400x300" alt="" className="w-full h-40 object-cover" />
          </div>
          <div className="absolute top-16 right-4 w-56 rotate-[4deg] shadow-xl rounded-xl overflow-hidden border-4 border-white">
            <img src="https://placehold.co/400x300" alt="" className="w-full h-40 object-cover" />
          </div>
          <div className="absolute bottom-0 left-20 w-56 rotate-[2deg] shadow-xl rounded-xl overflow-hidden border-4 border-white">
            <img src="https://placehold.co/400x300" alt="" className="w-full h-40 object-cover" />
          </div>
        </div>
      </section>

      {/* Wave divider — signature moment */}
      <svg viewBox="0 0 1200 60" className="w-full h-10 text-palm/20" preserveAspectRatio="none">
        <path
          d="M0,30 C150,60 350,0 600,30 C850,60 1050,0 1200,30 L1200,60 L0,60 Z"
          fill="currentColor"
        />
      </svg>

      {/* Journey */}
      <section className="bg-mist/30 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-semibold text-center text-ink mb-12">
            Three steps. No middleman toll.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
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
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-clay/15 flex items-center justify-center mb-4">
                <Wallet className="text-clay" size={26} />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink mb-2">Move in</h3>
              <p className="text-ink/70">
                Pay the landlord directly. No ghost agents, no stacked commissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-8">
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
      </section>
    </div>
  );
}