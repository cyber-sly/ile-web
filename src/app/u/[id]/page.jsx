import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import { freshCutoff } from "@/lib/property";
import PropertyCard from "@/components/PropertyCard";
import { Stars } from "@/components/Stars";
import EmptyState from "@/components/ui/EmptyState";
import { BadgeCheck, CalendarDays, Home as HomeIcon, MessageSquareQuote, Star } from "lucide-react";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public profile for a lister: their rating, reviews from people who viewed
// their properties, and what they currently have listed. Reviewers stay
// anonymous; home-seekers' names are never shown publicly.
const loadProfile = cache(async (id) => {
  if (!UUID.test(id)) return null;
  const [{ data: profile }, { data: ratingRows }, { data: reviews }, { data: listings }] = await Promise.all([
    supabaseServer.from("profiles").select("id, full_name, created_at").eq("id", id).maybeSingle(),
    supabaseServer.rpc("user_ratings", { p_users: [id], p_role: "lister" }),
    supabaseServer
      .from("reviews")
      .select("id, rating, comment, listing_accurate, created_at, listings(id, title)")
      .eq("reviewee_id", id)
      .eq("reviewee_role", "lister")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseServer
      .from("listings")
      .select("*")
      .eq("landlord_id", id)
      .eq("status", "active")
      .gte("last_confirmed_at", freshCutoff())
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  if (!profile) return null;
  return { profile, rating: ratingRows?.[0] || null, reviews: reviews || [], listings: listings || [] };
});

const monthYear = (iso) => new Date(iso).toLocaleDateString("en-NG", { month: "long", year: "numeric" });

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await loadProfile(id);
  if (!data) return { title: "Profile not found", robots: { index: false } };
  const name = data.profile.full_name?.trim() || "Lister";
  const r = data.rating;
  const description = r?.total
    ? `${name} is rated ${Number(r.average).toFixed(1)}/5 from ${r.total} review${r.total === 1 ? "" : "s"} on Ile. ${data.listings.length} properties listed.`
    : `${name} lists property on Ile. ${data.listings.length} properties available.`;
  return {
    title: `${name} · Lister`,
    description,
    alternates: { canonical: `/u/${id}` },
    openGraph: { title: `${name} on Ile`, description, url: `/u/${id}` },
  };
}

export default async function ProfilePage({ params }) {
  const { id } = await params;
  const data = await loadProfile(id);
  if (!data) notFound();

  const { profile, rating, reviews, listings } = data;
  const name = profile.full_name?.trim() || "Ile lister";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-palm font-serif text-4xl font-semibold text-white">
          {name[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <CalendarDays size={15} aria-hidden="true" /> Listing on Ile since {monthYear(profile.created_at)}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Rating</p>
              {rating?.total ? (
                <p className="mt-1 flex items-center gap-2">
                  <span className="text-2xl font-bold text-ink">{Number(rating.average).toFixed(1)}</span>
                  <Stars value={Number(rating.average)} size={16} />
                  <span className="text-sm text-ink-muted">
                    ({rating.total} review{rating.total === 1 ? "" : "s"})
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">No reviews yet</p>
              )}
            </div>
            {rating?.accurate_pct !== null && rating?.accurate_pct !== undefined && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Listings accurate</p>
                <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-ink">
                  <BadgeCheck size={20} className="text-palm" aria-hidden="true" /> {rating.accurate_pct}%
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Live listings</p>
              <p className="mt-1 text-2xl font-bold text-ink">{listings.length}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-ink md:text-3xl">Listings</h2>
        {listings.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={HomeIcon} title="Nothing listed right now">
              Check back later, or browse other listings on Ile.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <PropertyCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-ink md:text-3xl">Reviews</h2>
        <p className="mt-1 text-sm text-ink-muted">From home-seekers who booked and viewed a property through Ile.</p>
        {reviews.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={MessageSquareQuote} title="No reviews yet">
              Reviews appear here after people view {name.split(" ")[0]}&apos;s properties.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <Stars value={r.rating} />
                  <span className="text-xs text-ink-muted">{monthYear(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-3 text-ink">&ldquo;{r.comment}&rdquo;</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span className="flex items-center gap-1">
                    <Star size={12} aria-hidden="true" /> Verified viewing
                  </span>
                  {r.listing_accurate === true && <span className="font-semibold text-palm">Matched the listing</span>}
                  {r.listing_accurate === false && <span className="font-semibold text-clay">Didn&apos;t match the listing</span>}
                  {r.listings && (
                    <Link href={`/listings/${r.listings.id}`} className="truncate hover:text-ink">
                      {r.listings.title}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
