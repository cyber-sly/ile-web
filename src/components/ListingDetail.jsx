"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { stateLabel } from "@/lib/nigeria";
import {
  categoryOf, priceParts, fullPlace, detailFacts, isAvailable, freshCutoff, isExpired, isModerated,
} from "@/lib/property";
import Lightbox from "@/components/Lightbox";
import PhotoGallery from "@/components/PhotoGallery";
import BookingPanel from "@/components/BookingPanel";
import PropertyCard from "@/components/PropertyCard";
import SaveButton from "@/components/SaveButton";
import ReportListing from "@/components/ReportListing";
import EmptyState from "@/components/ui/EmptyState";
import Badge, { ListingTypeBadge, VerifiedBadge, BoostedBadge } from "@/components/ui/Badge";
import { button } from "@/components/ui/Button";
import {
  MapPin, BedDouble, Bath, Ruler, FileCheck2, Sofa, Car, Building2, Check, Share2, ChevronRight, ArrowLeft,
  Home as HomeIcon, ExternalLink, UserRound, Sparkles,
} from "lucide-react";

const TAB_FOR = { homes: null, land: "land", commercial: "commercial" };

// The facts grid adapts to what kind of property this is (rules in shared/property.js).
const FACT_ICONS = {
  type: Building2, bedrooms: BedDouble, bathrooms: Bath, furnishing: Sofa, size: Ruler, title: FileCheck2,
  parking: Car, toilets: Bath, lister: UserRound,
};

function factsFor(listing) {
  return detailFacts(listing).map((f) => ({ ...f, icon: FACT_ICONS[f.key] }));
}

// Interactive listing page. The listing itself is fetched on the server (see
// app/listings/[id]/page.jsx) so the HTML, WhatsApp previews and Google all
// get the real content; only the extras load in the browser.
export default function ListingDetail({ initialListing }) {
  const id = initialListing.id;
  const router = useRouter();
  const user = useUser();

  const [listing, setListing] = useState(initialListing);
  const [similar, setSimilar] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function fetchSimilar(data) {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .gte("last_confirmed_at", freshCutoff())
        .eq("category", categoryOf(data))
        .eq("listing_type", data.listing_type || "rent")
        .neq("id", id);
      if (data.state) query = query.eq("state", data.state);
      const { data: others } = await query.order("created_at", { ascending: false }).limit(4);
      setSimilar(others || []);
    }
    fetchSimilar(initialListing);
  }, [id, initialListing]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
        return;
      } catch {
        // dismissed: fall back to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleDelete() {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) setDeleteError(error.message);
    else router.push("/dashboard");
  }

  function scrollToBooking() {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          icon={HomeIcon}
          title="This listing isn't available"
          action={
            <Link href="/listings" className={button()}>
              Browse listings
            </Link>
          }
        >
          It may have been let, sold or removed by the lister.
        </EmptyState>
      </div>
    );
  }

  const images = listing.image_urls?.length ? listing.image_urls : listing.image_url ? [listing.image_url] : [];
  const videos = listing.video_urls || [];
  const features = listing.features || [];
  const category = categoryOf(listing);
  const isSale = listing.listing_type === "sale";
  const available = isAvailable(listing);
  const isOwner = user && user.id === listing.landlord_id;
  const { amount, suffix } = priceParts(listing);
  const paragraphs = (listing.description || "").split(/\n\s*\n/).filter(Boolean);
  const place = fullPlace(listing);
  const mapQuery = encodeURIComponent([listing.address, place, "Nigeria"].filter(Boolean).join(", "));
  const facts = factsFor(listing);

  const tab = category === "homes" ? (isSale ? "sale" : null) : TAB_FOR[category];
  const browseBase = tab ? `/listings?tab=${tab}` : "/listings";
  const withParam = (extra) => `${browseBase}${browseBase.includes("?") ? "&" : "?"}${extra}`;
  const crumbs = [
    { href: browseBase, label: category === "homes" ? (isSale ? "Homes for sale" : "Homes for rent") : category === "land" ? "Land" : "Commercial" },
    listing.state && { href: withParam(`state=${encodeURIComponent(listing.state)}`), label: stateLabel(listing.state) },
    listing.lga && { href: withParam(`state=${encodeURIComponent(listing.state)}&lga=${encodeURIComponent(listing.lga)}`), label: listing.lga },
  ].filter(Boolean);

  return (
    <div className="pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between gap-3 py-4">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-ink-muted">
            <Link href={browseBase} className="flex shrink-0 items-center gap-1 font-semibold hover:text-ink sm:hidden">
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </Link>
            <ol className="hidden min-w-0 items-center gap-1.5 sm:flex">
              {crumbs.map((c, i) => (
                <li key={c.href} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && <ChevronRight size={14} className="shrink-0" aria-hidden="true" />}
                  <Link href={c.href} className={`truncate hover:text-ink ${i === 0 ? "font-semibold" : ""}`}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={handleShare} className={button({ variant: "neutral", size: "sm" })}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
              {copied ? "Link copied" : "Share"}
            </button>
            <SaveButton id={listing.id} withLabel className="h-9 border border-line-strong bg-surface px-3.5 hover:border-ink/30" />
          </div>
        </div>

        {!available && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line-strong bg-surface px-5 py-4">
            <p className="font-semibold text-ink">
              {listing.status === "removed"
                ? "This listing was removed by Ile's moderators."
                : listing.status === "under_review"
                  ? "This listing is being reviewed by Ile after reports from users."
                  : `This property has been ${listing.status === "sold" ? "sold" : "let"} and is no longer available.`}
            </p>
            <Link href={browseBase} className={button({ size: "sm" })}>
              See similar listings
            </Link>
          </div>
        )}
        {available && isExpired(listing) && (
          <div className="mb-4 rounded-[var(--radius-card)] border border-gold bg-gold-soft px-5 py-4 text-sm text-ink">
            {isOwner ? (
              <>
                <span className="font-semibold">This listing is hidden from search</span> because it hasn&apos;t been confirmed in a while.
                Use &ldquo;Still available&rdquo; below to show it again.
              </>
            ) : (
              <>
                <span className="font-semibold">This listing may be out of date.</span> The lister hasn&apos;t confirmed it&apos;s still
                available recently. Message them before you travel to view it.
              </>
            )}
          </div>
        )}

        <div className={available ? "" : "opacity-80 grayscale-[35%]"}>
          <PhotoGallery
            images={images}
            title={listing.title}
            videoCount={videos.length}
            onOpen={setLightbox}
            onShowVideos={() => document.getElementById("videos")?.scrollIntoView({ behavior: "smooth" })}
          />
        </div>

        <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_380px] lg:gap-14">
          {/* Main column */}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <ListingTypeBadge type={listing.listing_type} />
              {!available && <Badge tone="clay">{listing.status === "sold" ? "Sold" : "Let"}</Badge>}
              {listing.serviced && <Badge tone="palm" icon={Sparkles}>Serviced</Badge>}
              {listing.is_verified && <VerifiedBadge />}
              {listing.is_boosted && <BoostedBadge />}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink md:text-[2.75rem]">
              {listing.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-ink-muted">
              <MapPin size={17} className="shrink-0" aria-hidden="true" /> {place}
            </p>
            <p className="mt-3 text-2xl font-bold text-ink lg:hidden">
              {amount}
              {suffix && <span className="text-base font-medium text-ink-muted"> {suffix}</span>}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-surface p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <Icon size={14} aria-hidden="true" /> {label}
                  </dt>
                  <dd className="mt-1.5 text-base font-bold leading-snug text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="mt-10">
              <h2 className="font-serif text-2xl font-semibold text-ink">About this {category === "land" ? "land" : "place"}</h2>
              {paragraphs.length > 0 ? (
                <div className="mt-3 space-y-4 text-[17px] leading-relaxed text-ink/85">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-ink-muted">The lister hasn&apos;t added a description yet. Book a viewing to see it in person.</p>
              )}
            </section>

            {features.length > 0 && (
              <section className="mt-10">
                <h2 className="font-serif text-2xl font-semibold text-ink">What&apos;s included</h2>
                <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-ink">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-palm-soft text-palm">
                        <Check size={15} strokeWidth={3} aria-hidden="true" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {videos.length > 0 && (
              <section id="videos" className="mt-10 scroll-mt-24">
                <h2 className="font-serif text-2xl font-semibold text-ink">Video tour</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {videos.map((url) => (
                    <video key={url} src={url} controls playsInline preload="metadata" className="aspect-video w-full rounded-[var(--radius-card)] bg-ink object-cover" />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-10">
              <h2 className="font-serif text-2xl font-semibold text-ink">Location</h2>
              <div className="mt-4 flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2.5 text-ink">
                  <MapPin size={19} className="mt-0.5 shrink-0 text-palm" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{place}</span>
                    {listing.address && <span className="block text-ink-muted">{listing.address}</span>}
                  </span>
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={button({ variant: "neutral", size: "sm", className: "shrink-0" })}
                >
                  Open in Maps <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            </section>
            {!isModerated(listing) && <ReportListing listing={listing} user={user} />}
          </div>

          {/* Action panel: pinned while the main column scrolls */}
          <aside id="book" className="scroll-mt-24">
            <div className="lg:sticky lg:top-24">
              {deleteError && <p className="mb-3 text-sm font-medium text-clay">{deleteError}</p>}
              <BookingPanel
                listing={listing}
                user={user}
                onDelete={handleDelete}
                onStatusChange={(changes) => setListing((l) => ({ ...l, ...changes }))}
              />
            </div>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-20 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
              More like this{listing.state ? ` in ${stateLabel(listing.state)}` : ""}
            </h2>
            <Link href={browseBase} className="text-sm font-semibold text-palm hover:underline">
              See all
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((l) => (
              <PropertyCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* Phones: price + booking shortcut, sitting above the tab bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl md:bottom-0 lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight text-ink">{amount}</p>
          <p className="text-xs text-ink-muted">{suffix ? suffix.replace("/", "per ") : isSale ? "asking price" : ""}</p>
        </div>
        <button type="button" onClick={scrollToBooking} className={button({ className: "shrink-0" })}>
          {isOwner ? "Manage" : available ? "Book viewing" : "Unavailable"}
        </button>
      </div>

      {lightbox !== null && (
        <Lightbox images={images} title={listing.title} start={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
