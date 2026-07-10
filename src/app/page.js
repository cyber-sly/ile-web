import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-6 py-16">
      <section className="max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.32em] text-slate-500 mb-4">Ile real estate</p>
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl mb-6">
          Find your next home without the wahala.
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-600 mb-10">
          Browse verified property listings, post your own home, and manage your dashboard with a fast,
          modern experience built on Next.js and Supabase.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/listings"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-8 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Browse listings
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-8 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}