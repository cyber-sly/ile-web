import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import { freshCutoff, listerLabel } from "@/lib/property";
import { formatResponseTime, registrationLabel } from "@/lib/profileDisplay";
import Avatar from "@/components/Avatar";
import PropertyCard from "@/components/PropertyCard";
import { Stars } from "@/components/Stars";
import EmptyState from "@/components/ui/EmptyState";
import { BadgeCheck, CalendarDays, Home as HomeIcon, MessageSquareQuote, Star, MapPin, Languages, Clock, Building2, Award } from "lucide-react";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public profile for a lister: their rating, reviews from people who viewed
// their properties, and what they currently have listed. Reviewers stay
// anonymous; home-seekers' names are never shown publicly.
const loadProfile = cache(async (id) => {
  if (!UUID.test(id)) return null;
  const [{ data: profile }, { data: ratingRows }, { data: reviews }, { data: listings }] = await Promise.all([
    supabaseServer
      .from("profiles")
      .select("id, full_name, created_at, avatar_url, bio, languages, lister_type, business_name, office_address, areas_covered, listing_since, registration_body")
      .eq("id", id)
      .maybeSingle(),
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
  const { data: response } = await supabaseServer.rpc("lister_response_times", { p_users: [id] });
  return {
    profile,
    rating: ratingRows?.[0] || null,
    reviews: reviews || [],
    listings: listings || [],
    responseMinutes: response?.[0]?.median_minutes ?? null,
  };
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

  const { profile, rating, reviews, listings, responseMinutes } = data;
  const name = profile.full_name?.trim() || "Ile lister";
  const response = formatResponseTime(responseMinutes);
  const details = [
    profile.lister_type && { icon: Building2, text: listerLabel(profile.lister_type) },
    response && { icon: Clock, text: response },
    profile.listing_since && { icon: CalendarDays, text: `Listing property since ${profile.listing_since}` },
    profile.registration_body && { icon: Award, text: `${registrationLabel(profile.registration_body)} registration provided` },
    profile.languages?.length > 0 && { icon: Languages, text: `Speaks ${profile.languages.join(", ")}` },
    profile.areas_covered?.length > 0 && { icon: MapPin, text: `Covers ${profile.areas_covered.join(" · ")}` },
    profile.office_address && { icon: Building2, text: `Office: ${profile.office_address}` },
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <header className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar src={profile.avatar_url} name={name} size="lg" className="self-start" />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{name}</h1>
          {profile.business_name && <p className="mt-0.5 font-semibold text-ink">{profile.business_name}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
            <CalendarDays size={15} aria-hidden="true" /> Listing on Ile since {monthYear(profile.created_at)}
          </p>
          {profile.bio && <p className="mt-3 max-w-2xl text-ink/85">{profile.bio}</p>}
          {details.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink-muted">
              {details.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2">
                  <Icon size={15} className="mt-0.5 shrink-0 text-palm" aria-hidden="true" /> {text}
                </li>
              ))}
            </ul>
          )}
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
