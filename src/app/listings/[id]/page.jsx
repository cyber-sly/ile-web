"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { formatNaira } from "@/lib/format";
import Lightbox from "@/components/Lightbox";
import PhotoGallery from "@/components/PhotoGallery";
import BookingPanel from "@/components/BookingPanel";
import PropertyCard from "@/components/PropertyCard";
import SaveButton from "@/components/SaveButton";
import EmptyState from "@/components/ui/EmptyState";
import { ListingTypeBadge, VerifiedBadge, BoostedBadge } from "@/components/ui/Badge";
import { button } from "@/components/ui/Button";
import {
  MapPin, BedDouble, Tag, Wallet, Check, Share2, ChevronRight, ArrowLeft, Home as HomeIcon, ExternalLink,
} from "lucide-react";

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6" aria-hidden="true">
      <div className="skeleton h-4 w-48 rounded" />
      <div className="skeleton mt-4 aspect-[4/3] rounded-[var(--radius-hero)] md:aspect-auto md:h-[460px]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <div className="skeleton h-9 w-2/3 rounded" />
          <div className="skeleton h-5 w-1/3 rounded" />
          <div className="skeleton h-24 w-full rounded" />
        </div>
        <div className="skeleton h-80 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useUser();

  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      const { data, error } = await supabase.from("listings").select("*").eq("id", id).single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setListing(data);
      setLoading(false);

      const { data: others } = await supabase
        .from("listings")
        .select("*")
        .eq("listing_type", data.listing_type || "rent")
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(4);
      setSimilar(others || []);
    }
    fetchListing();
  }, [id]);

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

  if (loading) return <DetailSkeleton />;

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
  const isSale = listing.listing_type === "sale";
  const bedrooms = Number(listing.bedrooms) || 0;
  const paragraphs = (listing.description || "").split(/\n\s*\n/).filter(Boolean);
  const mapQuery = encodeURIComponent([listing.address, listing.location, "Nigeria"].filter(Boolean).join(", "));

  const facts = [
    bedrooms > 0 && { icon: BedDouble, label: "Bedrooms", value: bedrooms },
    { icon: Tag, label: "Listing", value: isSale ? "For sale" : "For rent" },
    { icon: Wallet, label: isSale ? "Asking price" : "Rent per year", value: formatNaira(listing.price) },
    { icon: MapPin, label: "Area", value: listing.location },
  ].filter(Boolean);

  return (
    <div className="pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between gap-3 py-4">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-ink-muted">
            <Link href="/listings" className="flex shrink-0 items-center gap-1 font-semibold hover:text-ink">
              <ArrowLeft size={16} className="sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">{isSale ? "For sale" : "For rent"}</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <ChevronRight size={14} className="hidden shrink-0 sm:block" aria-hidden="true" />
            <span className="hidden truncate sm:inline">{listing.location}</span>
          </nav>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={handleShare} className={button({ variant: "neutral", size: "sm" })}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
              {copied ? "Link copied" : "Share"}
            </button>
            <SaveButton
              id={listing.id}
              withLabel
              className="h-9 border border-line-strong bg-surface px-3.5 hover:border-ink/30"
            />
          </div>
        </div>

        <PhotoGallery
          images={images}
          title={listing.title}
          videoCount={videos.length}
          onOpen={setLightbox}
          onShowVideos={() => document.getElementById("videos")?.scrollIntoView({ behavior: "smooth" })}
        />

        <div className="grid gap-10 pt-8 lg:grid-cols-[1fr_380px] lg:gap-14">
          {/* Main column */}
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <ListingTypeBadge type={listing.listing_type} />
              {listing.is_verified && <VerifiedBadge />}
              {listing.is_boosted && <BoostedBadge />}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-ink md:text-[2.75rem]">
              {listing.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-ink-muted">
              <MapPin size={17} className="shrink-0" aria-hidden="true" /> {listing.location}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-surface p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <Icon size={14} aria-hidden="true" /> {label}
                  </dt>
                  <dd className="mt-1.5 truncate text-lg font-bold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="mt-10">
              <h2 className="font-serif text-2xl font-semibold text-ink">About this place</h2>
              {paragraphs.length > 0 ? (
                <div className="mt-3 space-y-4 text-[17px] leading-relaxed text-ink/85">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-ink-muted">
                  The lister hasn&apos;t added a description yet. Book a viewing to see it in person.
                </p>
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
                    <video
                      key={url}
                      src={url}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full rounded-[var(--radius-card)] bg-ink object-cover"
                    />
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
                    <span className="font-semibold">{listing.location}</span>
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
          </div>

          {/* Action panel: pinned while the main column scrolls */}
          <aside id="book" className="scroll-mt-24">
            <div className="lg:sticky lg:top-24">
              {deleteError && <p className="mb-3 text-sm font-medium text-clay">{deleteError}</p>}
              <BookingPanel listing={listing} user={user} onDelete={handleDelete} />
            </div>
          </aside>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-20 sm:px-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
              More {isSale ? "property for sale" : "homes for rent"}
            </h2>
            <Link href={`/listings?type=${isSale ? "sale" : "rent"}`} className="text-sm font-semibold text-palm hover:underline">
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
      <div className="fixed inset-x-0 bottom-16 md:bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold leading-tight text-ink">{formatNaira(listing.price)}</p>
          <p className="text-xs text-ink-muted">{isSale ? "asking price" : "per year"}</p>
        </div>
        <button type="button" onClick={scrollToBooking} className={button({ className: "shrink-0" })}>
          {user && user.id === listing.landlord_id ? "Manage" : "Book viewing"}
        </button>
      </div>

      {lightbox !== null && (
        <Lightbox images={images} title={listing.title} start={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
