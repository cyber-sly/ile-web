"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Lightbox from "@/components/Lightbox";
import PropertyCard from "@/components/PropertyCard";
import {
  MapPin, BedDouble, CalendarDays, CheckCircle2, AlertCircle, Home as HomeIcon,
  Pencil, Trash2, Sparkles, Heart, Share2, Check, ArrowLeft, Grid2x2, Key, Wallet,
  ChevronLeft, ChevronRight, Tag,
} from "lucide-react";

const SAVED_KEY = "ile:saved-listings";
const SLIDE_MS = 5500;

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

const glassBtn =
  "flex h-11 items-center justify-center gap-2 rounded-full border border-white/25 bg-ink/40 px-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-ink/60";
const shadow = { textShadow: "0 2px 28px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)" };

function DetailSkeleton() {
  return (
    <div>
      <div className="skeleton h-[70svh] w-full" />
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
        <div className="skeleton h-8 w-1/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const touchX = useRef(null);

  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    async function fetchListing() {
      const [{ data, error }, { data: userData }, { data: others }] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id).single(),
        supabase.auth.getUser(),
        supabase
          .from("listings")
          .select("*")
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (!error) setListing(data);
      setSimilar(others || []);
      setCurrentUserId(userData?.user?.id ?? null);
      setSaved(readSaved().includes(id));
      setLoading(false);
    }

    fetchListing();
  }, [id]);

  const images = listing
    ? listing.image_urls?.length
      ? listing.image_urls
      : listing.image_url
        ? [listing.image_url]
        : []
    : [];
  const videos = listing?.video_urls || [];
  const features = listing?.features || [];
  const imageCount = images.length;

  // Hero slideshow: gentle auto-advance, paused on hover/lightbox/reduced motion.
  useEffect(() => {
    if (imageCount < 2 || paused || lightbox !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % imageCount), SLIDE_MS);
    return () => clearInterval(timer);
  }, [imageCount, paused, lightbox]);

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(imageCount > 1 || videos.length ? [{ id: "photos", label: "Photos" }] : []),
    ...(features.length ? [{ id: "features", label: "Features" }] : []),
    { id: "book", label: "Book inspection" },
  ];
  const tabKey = tabs.map((t) => t.id).join(",");

  // Scroll-spy: highlight the tab whose section crosses the middle of the screen.
  useEffect(() => {
    if (!listing) return;
    const els = tabKey
      .split(",")
      .map((t) => document.getElementById(t))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActiveTab(e.target.id));
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [listing, tabKey]);

  function goTo(tabId) {
    document.getElementById(tabId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleSaved() {
    const current = readSaved();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {}
    setSaved(next.includes(id));
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
        return;
      } catch {
        // dismissed, or share failed: fall through to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleBookInspection(e) {
    e.preventDefault();
    setMessage("");
    setBooking(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please log in as a tenant to book an inspection.");
      setMessageType("error");
      setBooking(false);
      return;
    }

    const { error: insertError } = await supabase.from("inspections").insert({
      listing_id: id,
      tenant_id: user.id,
      preferred_date: preferredDate,
      preferred_time: preferredTime || null,
    });

    if (insertError) {
      setMessage(insertError.message);
      setMessageType("error");
      setBooking(false);
      return;
    }

    setMessage("Inspection request sent! The landlord will confirm soon.");
    setMessageType("success");
    setBooking(false);
    setPreferredDate("");
    setPreferredTime("");
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this listing? This can't be undone.");
    if (!confirmed) return;

    const { error: deleteError } = await supabase.from("listings").delete().eq("id", id);
    if (!deleteError) router.push("/dashboard");
  }

  if (loading) return <DetailSkeleton />;
  if (!listing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-palm/10">
          <HomeIcon className="text-palm" size={28} />
        </span>
        <h1 className="font-display text-2xl font-semibold text-ink">Listing not found</h1>
        <p className="text-ink/60">It may have been removed by the landlord.</p>
        <Link
          href="/listings"
          className="rounded-full bg-palm px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-palm-dark"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  const isOwner = currentUserId && currentUserId === listing.landlord_id;
  const isSale = listing.listing_type === "sale";
  const price = `₦${Number(listing.price).toLocaleString()}`;
  const today = new Date().toISOString().slice(0, 10);
  const paragraphs = (listing.description || "").split(/\n\s*\n/).filter(Boolean);

  const step = (delta) => setSlide((s) => (s + delta + imageCount) % imageCount);

  return (
    <div className="pb-24 md:pb-0">
      {/* ───────── Immersive hero ───────── */}
      <section
        aria-label="Photos"
        className="relative isolate h-[74svh] min-h-[520px] max-h-[860px] overflow-hidden bg-ink text-white"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null || imageCount < 2) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        }}
      >
        {imageCount === 0 ? (
          <div className="absolute inset-0 -z-10 flex items-center justify-center bg-mist text-ink/25">
            <HomeIcon size={72} />
          </div>
        ) : (
          images.map((url, i) => {
            const on = i === slide;
            return (
              <img
                key={url}
                src={url}
                alt={i === 0 ? listing.title : ""}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "auto"}
                className="absolute inset-0 -z-10 h-full w-full object-cover"
                style={{
                  opacity: on ? 1 : 0,
                  transform: on ? "scale(1.07)" : "scale(1)",
                  transition: on
                    ? "opacity 900ms ease, transform 9000ms linear"
                    : "opacity 900ms ease, transform 0s 900ms",
                }}
              />
            );
          })
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/25 to-ink/45" />

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-5 sm:px-8">
          <Link href="/listings" className={glassBtn}>
            <ArrowLeft size={16} /> All listings
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            {isOwner && (
              <>
                <Link href={`/listings/${id}/edit`} className={glassBtn}>
                  <Pencil size={15} /> Edit
                </Link>
                <button onClick={handleDelete} className={`${glassBtn} hover:!bg-clay/80`}>
                  <Trash2 size={15} /> Delete
                </button>
              </>
            )}
            <button
              type="button"
              onClick={toggleSaved}
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved" : "Save listing"}
              className={`${glassBtn} !px-0 w-11`}
            >
              <Heart size={18} className={saved ? "fill-clay text-clay" : ""} />
            </button>
            <button type="button" onClick={handleShare} aria-label="Share listing" className={glassBtn}>
              {copied ? <Check size={16} /> : <Share2 size={16} />}
              <span className="hidden sm:inline">{copied ? "Link copied" : "Share"}</span>
            </button>
          </div>
        </div>

        {/* Title block */}
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 pb-8 sm:px-8 sm:pb-10">
          <div className="max-w-3xl">
            <span
              className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold tracking-widest text-white ${
                isSale ? "bg-clay" : "bg-palm"
              }`}
            >
              {isSale ? "FOR SALE" : "FOR RENT"}
            </span>
            <h1
              style={shadow}
              className="animate-fade-up mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl"
            >
              {listing.title}
            </h1>
            <p style={shadow} className="mt-3 flex items-center gap-2 text-lg font-medium text-white/95">
              <MapPin size={20} className="shrink-0" /> {listing.location}
            </p>
            <p style={shadow} className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              {price}
              {!isSale && <span className="text-lg font-medium text-white/80"> /year</span>}
            </p>
          </div>

          {imageCount > 1 && (
            <div className="hidden items-end gap-3 lg:flex">
              <div className="flex gap-2">
                {images.slice(0, 5).map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setSlide(i)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === slide}
                    className={`h-16 w-24 overflow-hidden rounded-lg transition-all duration-300 ${
                      i === slide
                        ? "opacity-100 ring-2 ring-white"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setLightbox(slide)} className={glassBtn}>
                <Grid2x2 size={16} /> All {imageCount} photos
              </button>
            </div>
          )}
        </div>

        {imageCount > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink/35 backdrop-blur-md transition-all hover:bg-ink/60 md:flex"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-ink/35 backdrop-blur-md transition-all hover:bg-ink/60 md:flex"
            >
              <ChevronRight size={22} />
            </button>
            {/* Progress bars, one per photo */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 px-6 lg:hidden">
              {images.map((url, i) => (
                <span
                  key={url}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === slide ? "w-8 bg-white" : "w-3 bg-white/45"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* ───────── Sticky section nav ───────── */}
      <div className="sticky top-[65px] z-40 border-b border-mist bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <nav aria-label="Sections" className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goTo(t.id)}
                aria-current={activeTab === t.id}
                className={`relative whitespace-nowrap px-4 py-4 text-sm font-semibold transition-colors ${
                  activeTab === t.id ? "text-palm" : "text-ink/60 hover:text-ink"
                }`}
              >
                {t.label}
                <span
                  className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-palm transition-transform duration-300 ${
                    activeTab === t.id ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            ))}
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            <span className="font-display text-lg font-bold text-ink">
              {price}
              {!isSale && <span className="text-sm font-medium text-ink/50"> /yr</span>}
            </span>
            <button
              type="button"
              onClick={() => goTo("book")}
              className="rounded-full bg-palm px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-palm/30 transition-all hover:-translate-y-0.5 hover:bg-palm-dark"
            >
              Book inspection
            </button>
          </div>
        </div>
      </div>

      {/* ───────── Overview ───────── */}
      <section id="overview" className="scroll-mt-32 bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 md:py-20">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: BedDouble, label: "Bedrooms", value: listing.bedrooms },
              { icon: Tag, label: "Listing", value: isSale ? "For sale" : "For rent" },
              { icon: Wallet, label: isSale ? "Price" : "Per year", value: price },
              { icon: MapPin, label: "Area", value: listing.location },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-mist bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-palm/10 text-palm">
                  <Icon size={20} />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink/45">{label}</p>
                <p className="mt-1 truncate font-display text-xl font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-5">
            <div className="md:col-span-3">
              <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">About this place</h2>
              {paragraphs.length > 0 ? (
                <div className="mt-6 space-y-5">
                  {paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={`whitespace-pre-line leading-relaxed ${
                        i === 0 ? "text-xl text-ink/80" : "text-lg text-ink/65"
                      }`}
                    >
                      {p}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-lg text-ink/55">
                  The landlord hasn&apos;t added a description yet. Book an inspection to see it in person.
                </p>
              )}
            </div>

            <aside className="md:col-span-2">
              <div className="rounded-2xl border border-mist bg-white p-6">
                <h3 className="font-display text-lg font-semibold text-ink">Location</h3>
                <p className="mt-3 flex items-start gap-2 text-ink/70">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-palm" />
                  <span>
                    {listing.location}
                    {listing.address && <span className="block text-ink/50">{listing.address}</span>}
                  </span>
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [listing.address, listing.location].filter(Boolean).join(", "),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-palm hover:text-palm"
                >
                  Open in Maps <ChevronRight size={16} />
                </a>
                <div className="mt-6 border-t border-mist pt-5">
                  <p className="flex items-center gap-2 text-sm text-ink/60">
                    <Key size={16} className="text-sun" /> Pay the landlord directly. No agent commissions.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ───────── Photo wall ───────── */}
      {(imageCount > 1 || videos.length > 0) && (
        <section id="photos" className="scroll-mt-32 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 md:py-20">
            <div className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">Take a look inside</h2>
              {imageCount > 1 && (
                <button
                  type="button"
                  onClick={() => setLightbox(0)}
                  className="hidden items-center gap-2 rounded-full border border-mist px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-palm hover:text-palm sm:flex"
                >
                  <Grid2x2 size={16} /> Full screen
                </button>
              )}
            </div>
            {imageCount > 1 && (
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label={`Open photo ${i + 1} of ${imageCount}`}
                    className="group mb-4 block w-full cursor-zoom-in break-inside-avoid overflow-hidden rounded-2xl bg-mist"
                  >
                    <img
                      src={url}
                      alt={`${listing.title} — photo ${i + 1}`}
                      loading="lazy"
                      className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            )}
            {videos.length > 0 && (
              <div className={`grid gap-4 md:grid-cols-2 ${imageCount > 1 ? "mt-6" : ""}`}>
                {videos.map((url) => (
                  <video
                    key={url}
                    src={url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-2xl bg-ink object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ───────── Features ───────── */}
      {features.length > 0 && (
        <section id="features" className="scroll-mt-32 bg-paper">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-8 md:py-20">
            <h2 className="flex items-center gap-3 font-display text-3xl font-bold text-ink md:text-4xl">
              <Sparkles className="text-sun" size={30} /> What&apos;s included
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-3 rounded-2xl border border-mist bg-white px-5 py-4 font-medium text-ink transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-palm/10 text-palm">
                    <Check size={16} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────── Booking band ───────── */}
      <section id="book" className="scroll-mt-24 bg-gradient-to-br from-palm-dark via-palm to-palm-dark text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 sm:px-8 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-white/70">Ready when you are</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight md:text-5xl">
              See it in person.
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                ["Pick a day", "Choose the date and time that suits you."],
                ["Landlord confirms", "You'll hear back once they accept."],
                ["Walk through", "Visit the home before you commit to anything."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 font-display font-bold">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{t}</span>
                    <span className="text-white/75">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl shadow-black/30 sm:p-8">
            <h3 className="mb-1 flex items-center gap-2 font-display text-xl font-bold">
              <CalendarDays size={20} className="text-palm" /> Book an Inspection
            </h3>
            <p className="mb-5 text-sm text-ink/55">{listing.title}</p>
            <form onSubmit={handleBookInspection} className="flex flex-col gap-3">
              <label className="text-sm font-medium text-ink/70">
                Preferred date
                <input
                  type="date"
                  min={today}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-mist px-3 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-palm"
                />
              </label>
              <label className="text-sm font-medium text-ink/70">
                Preferred time <span className="text-ink/40">(optional)</span>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-mist px-3 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-palm"
                />
              </label>
              <button
                type="submit"
                disabled={booking}
                className="mt-2 rounded-full bg-palm py-3.5 text-base font-semibold text-white shadow-md shadow-palm/25 transition-all hover:-translate-y-0.5 hover:bg-palm-dark disabled:translate-y-0 disabled:opacity-50"
              >
                {booking ? "Booking..." : "Request Inspection"}
              </button>
              {message && (
                <p
                  role="status"
                  className={`flex items-start gap-1.5 text-sm ${
                    messageType === "error" ? "text-clay" : "text-palm"
                  }`}
                >
                  {messageType === "error" ? (
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  )}
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ───────── More homes ───────── */}
      {similar.length > 0 && (
        <section className="bg-paper">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 md:py-20">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">More homes to explore</h2>
              <Link href="/listings" className="text-sm font-semibold text-palm hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((l) => (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="block h-full rounded-2xl no-underline text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-palm"
                >
                  <PropertyCard
                    variant="roomy"
                    title={l.title}
                    location={l.location}
                    price={l.price}
                    bedrooms={l.bedrooms}
                    imageUrl={l.image_url}
                    listingType={l.listing_type}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Phones: persistent booking bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-mist bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <div>
          <p className="font-display text-xl font-bold leading-none text-ink">{price}</p>
          <p className="mt-1 text-xs text-ink/50">{isSale ? "asking price" : "per year"}</p>
        </div>
        <button
          type="button"
          onClick={() => goTo("book")}
          className="rounded-full bg-palm px-6 py-3 text-sm font-semibold text-white shadow-md shadow-palm/30 transition-colors hover:bg-palm-dark"
        >
          Book inspection
        </button>
      </div>

      {lightbox !== null && (
        <Lightbox
          images={images}
          title={listing.title}
          start={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
