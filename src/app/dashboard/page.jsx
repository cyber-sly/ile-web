"use client";

import { friendlyError } from "@shared/errors.js";
import { confirmAction } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { useState, useEffect } from "react";
import { listingActions, requestActions, takenStatus } from "@shared/lister.js";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { formatDateTime } from "@/lib/format";
import { priceParts, placeLabel, isAvailable, isModerated, isExpired, needsConfirming, isBoosted, STATUS_LABELS } from "@/lib/property";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import EmptyState from "@/components/ui/EmptyState";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import Badge, { StatusBadge, ListingTypeBadge } from "@/components/ui/Badge";
import { button } from "@/components/ui/Button";
import MessageButton from "@/components/MessageButton";
import { fetchPeople, fetchTenantDetails, occupationLabel, moveInLabel } from "@/lib/profile";
import Avatar from "@/components/Avatar";
import { canReview, fetchRatings, fetchReviewedIds, viewingDateReached } from "@/lib/reviews";
import ReviewForm from "@/components/ReviewForm";
import { RatingSummary } from "@/components/Stars";
import {
  Plus, Pencil, Trash2, CalendarDays, Clock, Home as HomeIcon, ImageOff, ChevronDown, Eye, CheckCircle2, RotateCcw, CalendarClock, ChevronRight, Share2, Rocket,
} from "lucide-react";
import ShareListing from "@/components/ShareListing";
import ShareStats from "@/components/ShareStats";
import BoostDialog from "@/components/BoostDialog";
import { fetchReferralSummary } from "@/lib/referrals";

const GROUPS = [
  { key: "reply", title: "Needs your reply", statuses: ["pending"] },
  { key: "upcoming", title: "Confirmed viewings", statuses: ["confirmed"] },
  { key: "waiting", title: "Waiting on the home-seeker", statuses: ["countered"] },
  { key: "past", title: "Past and closed", statuses: ["done", "declined", "cancelled"], collapsed: true },
];

export default function DashboardPage() {
  const user = useUser();

  const [listings, setListings] = useState([]);
  const [sharing, setSharing] = useState(null);
  const [summary, setSummary] = useState(null);
  const [boosting, setBoosting] = useState(null);

  // Share stats and boost days (null until the feature is set up).
  useEffect(() => {
    if (!user) return;
    let live = true;
    fetchReferralSummary()
      .then((s) => live && setSummary(s))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user, boosting]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mutationError, setMutationError] = useState("");
  const [people, setPeople] = useState({});
  const [tenantInfo, setTenantInfo] = useState({});
  const [myViewings, setMyViewings] = useState([]);
  const [ratings, setRatings] = useState({});
  const [reviewed, setReviewed] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    async function fetchDashboardData() {
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("*")
        .eq("landlord_id", user.id)
        .order("created_at", { ascending: false });

      if (listingsError) {
        setError(friendlyError(listingsError));
        setLoading(false);
        return;
      }
      setListings(listingsData);

      const ids = listingsData.map((l) => l.id);
      if (ids.length > 0) {
        const { data, error: inspectionsError } = await supabase
          .from("inspections")
          .select("*, listings(id, title, image_url, location)")
          .in("listing_id", ids)
          .order("created_at", { ascending: false });
        if (inspectionsError) setError(friendlyError(inspectionsError));
        else {
          setInspections(data);
          const tenantIds = data.map((i) => i.tenant_id);
          const [p, info, r, done] = await Promise.all([
            fetchPeople(tenantIds),
            fetchTenantDetails(tenantIds),
            fetchRatings(tenantIds, "tenant"),
            fetchReviewedIds(data.filter(canReview).map((i) => i.id)),
          ]);
          setPeople(p);
          setTenantInfo(info);
          setRatings(r);
          setReviewed(done);
        }
      }
      setLoading(false);
    }

    fetchDashboardData();

    // Viewings this account has booked on other people's properties (agents
    // viewing for clients, landlords looking to rent or buy).
    supabase
      .from("inspections")
      .select("status")
      .eq("tenant_id", user.id)
      .in("status", ["pending", "countered", "confirmed"])
      .then(({ data }) => setMyViewings(data || []));
  }, [user]);

  async function updateInspection(id, changes) {
    setMutationError("");
    const { error: updateError } = await supabase.from("inspections").update(changes).eq("id", id);
    if (updateError) {
      setMutationError(friendlyError(updateError));
      return false;
    }
    setInspections((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
    return true;
  }

  async function deleteListing(id) {
    if (!(await confirmAction({ title: "Delete this listing?", body: "This can't be undone.", confirmLabel: "Delete listing" }))) return;
    setMutationError("");
    const { error: deleteError } = await supabase.from("listings").delete().eq("id", id);
    if (deleteError) {
      setMutationError(friendlyError(deleteError));
      return;
    }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast("Listing deleted");
  }

  async function updateListing(listing, changes) {
    setMutationError("");
    const { error: updateError } = await supabase.from("listings").update(changes).eq("id", listing.id);
    if (updateError) {
      setMutationError(friendlyError(updateError));
      return;
    }
    setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, ...changes } : l)));
  }
  const confirmNow = () => ({ last_confirmed_at: new Date().toISOString() });

  if (user === undefined || (user && loading)) return <PageSkeleton />;

  if (!user) {
    return (
      <AccessWall
        title="Log in to your dashboard"
        primary={{ href: "/login?next=/dashboard", label: "Log in" }}
        secondary={{ href: "/signup?role=landlord&next=/listings/new", label: "Create lister account" }}
      >
        Your dashboard is where you manage listings and viewing requests.
      </AccessWall>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert>{error}</Alert>
      </div>
    );
  }

  const count = (statuses) => inspections.filter((i) => statuses.includes(i.status)).length;
  const firstName = (user.user_metadata?.full_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">
            {firstName ? `Welcome, ${firstName}` : "Your dashboard"}
          </h1>
          <p className="mt-2 text-ink-muted">Manage your listings and reply to viewing requests.</p>
        </div>
        <Link href="/listings/new" className={button()}>
          <Plus size={17} aria-hidden="true" /> New listing
        </Link>
      </div>

      {myViewings.length > 0 && (
        <Link
          href="/my-bookings"
          className="mt-6 flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-palm-soft text-palm">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-ink">
              Viewings you&apos;ve booked ({myViewings.length})
            </span>
            <span className="block text-sm text-ink-muted">
              {myViewings.some((v) => v.status === "countered")
                ? "A lister suggested a new time. Reply in My viewings."
                : "Properties you're going to see on other people's listings."}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>
      )}

      <dl className="mt-8 grid grid-cols-3 gap-3">
        {[
          { label: "Live listings", value: listings.filter((l) => isAvailable(l) && !isExpired(l)).length },
          { label: "Need a reply", value: count(["pending"]), highlight: count(["pending"]) > 0 },
          { label: "Confirmed", value: count(["confirmed"]) },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-[var(--radius-card)] border p-4 sm:p-5 ${
              s.highlight ? "border-gold bg-gold-soft" : "border-line bg-surface"
            }`}
          >
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted sm:text-sm sm:normal-case sm:tracking-normal">
              {s.label}
            </dt>
            <dd className="mt-1 font-serif text-3xl font-semibold text-ink sm:text-4xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      {mutationError && <Alert className="mt-6">{mutationError}</Alert>}
      {listings.some(needsConfirming) && (
        <p className="mt-6 rounded-[var(--radius-card)] border border-gold bg-gold-soft px-4 py-3 text-sm text-ink">
          <span className="font-semibold">
            {listings.filter(needsConfirming).length} listing{listings.filter(needsConfirming).length === 1 ? "" : "s"} need confirming.
          </span>{" "}
          Tell us they&apos;re still available so they stay in search. Listings unconfirmed for 45 days are hidden.
        </p>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* Viewing requests */}
        <section aria-labelledby="requests-heading">
          <h2 id="requests-heading" className="font-serif text-2xl font-semibold text-ink">
            Viewing requests
          </h2>
          {inspections.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={CalendarDays} title="No requests yet">
                When someone books a viewing on one of your listings, it shows up here.
              </EmptyState>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-8">
              {GROUPS.map((g) => {
                const items = inspections.filter((i) => g.statuses.includes(i.status));
                if (items.length === 0) return null;
                return (
                  <RequestGroup key={g.key} title={g.title} count={items.length} collapsed={g.collapsed}>
                    {items.map((inspection) => (
                      <RequestCard
                        key={inspection.id}
                        inspection={inspection}
                        name={people[inspection.tenant_id]?.name}
                        avatar={people[inspection.tenant_id]?.avatar}
                        info={tenantInfo[inspection.tenant_id]}
                        rating={ratings[inspection.tenant_id]}
                        reviewed={reviewed.has(inspection.id)}
                        onReviewed={() => setReviewed((prev) => new Set(prev).add(inspection.id))}
                        user={user}
                        onUpdate={updateInspection}
                      />
                    ))}
                  </RequestGroup>
                );
              })}
            </div>
          )}
        </section>

        {/* Listings */}
        <section aria-labelledby="listings-heading">
          {sharing && <ShareListing listing={sharing} user={user} onClose={() => setSharing(null)} />}
          {boosting && summary && (
            <BoostDialog
              listing={boosting}
              balance={summary.balance}
              onDone={(id, until) => setListings((all) => all.map((x) => (x.id === id ? { ...x, boosted_until: until } : x)))}
              onClose={() => setBoosting(null)}
            />
          )}
          <ShareStats summary={summary} />
          <h2 id="listings-heading" className="font-serif text-2xl font-semibold text-ink">
            Your listings
          </h2>
          {listings.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={HomeIcon}
                title="No listings yet"
                action={
                  <Link href="/listings/new" className={button()}>
                    List a property
                  </Link>
                }
              >
                It&apos;s free and takes about five minutes.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {listings.map((l) => (
                <li key={l.id} className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3">
                  <Link href={`/listings/${l.id}`} className="h-20 w-24 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-line">
                    {l.image_url ? (
                      <img src={l.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-muted/50">
                        <ImageOff size={22} aria-hidden="true" />
                      </span>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/listings/${l.id}`} className="line-clamp-1 font-semibold text-ink hover:text-palm">
                        {l.title}
                      </Link>
                      <ListingTypeBadge type={l.listing_type} className="shrink-0" />
                    </div>
                    <p className="text-sm font-bold text-ink">
                      {priceParts(l).amount}
                      <span className="font-medium text-ink-muted"> {priceParts(l, { short: true }).suffix}</span>
                    </p>
                    <p className="truncate text-xs text-ink-muted">{placeLabel(l)}</p>
                    {!isAvailable(l) && (
                      <Badge tone={isModerated(l) ? "clay" : "neutral"} className="mt-1 self-start">
                        {STATUS_LABELS[l.status] || l.status} · hidden from search
                      </Badge>
                    )}
                    {isExpired(l) && <Badge tone="gold" className="mt-1 self-start">Not confirmed · hidden from search</Badge>}
                    {listingActions(l).confirm && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-control)] bg-gold-soft px-2.5 py-1.5 text-xs text-ink">
                        <span className="font-semibold">Still available?</span>
                        <button type="button" onClick={() => updateListing(l, confirmNow())} className="font-semibold text-palm hover:underline">
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateListing(l, { status: takenStatus(l) })}
                          className="font-semibold text-ink-muted hover:underline"
                        >
                          No, it&apos;s {takenStatus(l)}
                        </button>
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap gap-1 pt-1">
                      <Link href={`/listings/${l.id}/viewings`} className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}>
                        <CalendarClock size={14} aria-hidden="true" /> Times
                      </Link>
                      <Link href={`/listings/${l.id}`} className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}>
                        <Eye size={14} aria-hidden="true" /> View
                      </Link>
                      <Link href={`/listings/${l.id}/edit`} className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}>
                        <Pencil size={14} aria-hidden="true" /> Edit
                      </Link>
                      {isAvailable(l) && (
                        <button
                          type="button"
                          onClick={() => setSharing(l)}
                          className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}
                        >
                          <Share2 size={14} aria-hidden="true" /> Share
                        </button>
                      )}
                      {isAvailable(l) && summary && (
                        <button
                          type="button"
                          onClick={() => setBoosting(l)}
                          className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}
                        >
                          <Rocket size={14} aria-hidden="true" /> {isBoosted(l) ? "Boosted" : "Boost"}
                        </button>
                      )}
                      {listingActions(l).markTaken ? (
                        <button
                          type="button"
                          onClick={() => updateListing(l, { status: takenStatus(l) })}
                          className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}
                        >
                          <CheckCircle2 size={14} aria-hidden="true" /> {l.listing_type === "sale" ? "Sold" : "Let"}
                        </button>
                      ) : listingActions(l).relist ? (
                        <button
                          type="button"
                          onClick={() => updateListing(l, { status: "active", ...confirmNow() })}
                          className={button({ variant: "ghost", size: "sm", className: "!h-8 !px-2.5" })}
                        >
                          <RotateCcw size={14} aria-hidden="true" /> Relist
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => deleteListing(l.id)}
                        className={button({ variant: "danger-ghost", size: "sm", className: "!h-8 !px-2.5" })}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function RequestGroup({ title, count, collapsed = false, children }) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wider text-ink-muted"
      >
        {title} <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs">{count}</span>
        <ChevronDown size={16} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <ul className="mt-3 flex flex-col gap-3">{children}</ul>}
    </div>
  );
}

function RequestCard({ inspection, name, avatar, info, rating, reviewed, onReviewed, user, onUpdate }) {
  const [proposing, setProposing] = useState(false);
  const [date, setDate] = useState(inspection.preferred_date || "");
  const [time, setTime] = useState(inspection.preferred_time || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const l = inspection.listings;

  // `confirm` = confirmAction() options, for actions that close the request.
  async function act(changes, confirm, done) {
    if (confirm && !(await confirmAction(confirm))) return;
    setBusy(true);
    const ok = await onUpdate(inspection.id, changes);
    setBusy(false);
    if (ok) {
      setProposing(false);
      if (done) toast(done);
    }
  }

  function sendProposal(e) {
    e.preventDefault();
    act({ status: "countered", proposed_date: date, proposed_time: time || null, landlord_note: note || null }, null, "New time sent");
  }

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/listings/${l?.id}`} className="line-clamp-1 font-semibold text-ink hover:text-palm">
            {l?.title || "Listing"}
          </Link>
          <div className="mt-1.5 flex items-center gap-2">
            <Avatar src={avatar} name={name || "Home-seeker"} size="xs" />
            <span className="text-sm text-ink">{name || "A home-seeker"}</span>
          </div>
          <RatingSummary rating={rating} className="mt-0.5" />
          {(info?.occupation || info?.move_in_timeline) && (
            <p className="mt-0.5 text-xs text-ink-muted">
              {[occupationLabel(info.occupation), info.move_in_timeline && `Moving: ${moveInLabel(info.move_in_timeline).toLowerCase()}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <StatusBadge status={inspection.status} />
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-ink">
        <CalendarDays size={16} className="shrink-0 text-palm" aria-hidden="true" />
        Requested for {formatDateTime(inspection.preferred_date, inspection.preferred_time)}
      </p>
      {inspection.status === "countered" && (
        <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-muted">
          <Clock size={16} className="shrink-0" aria-hidden="true" />
          You suggested {formatDateTime(inspection.proposed_date, inspection.proposed_time)}
        </p>
      )}
      {inspection.landlord_note && inspection.status !== "pending" && (
        <p className="mt-1.5 text-sm text-ink-muted">Your note: &ldquo;{inspection.landlord_note}&rdquo;</p>
      )}

      {requestActions(inspection).confirm && !proposing && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => act({ status: "confirmed" }, null, "Viewing confirmed")} className={button({ size: "sm" })}>
            Confirm
          </button>
          <button type="button" disabled={busy} onClick={() => setProposing(true)} className={button({ variant: "neutral", size: "sm" })}>
            Suggest another time
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act({ status: "declined" }, { title: "Decline this viewing request?", confirmLabel: "Decline" }, "Request declined")}
            className={button({ variant: "danger-ghost", size: "sm" })}
          >
            Decline
          </button>
        </div>
      )}

      {(requestActions(inspection).done || requestActions(inspection).cancel) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {requestActions(inspection).done ? (
            <button type="button" disabled={busy} onClick={() => act({ status: "done" }, null, "Marked as done")} className={button({ variant: "neutral", size: "sm" })}>
              Mark as viewed
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  { status: "declined" },
                  { title: "Cancel this viewing?", body: "The home-seeker will see it's been cancelled.", confirmLabel: "Cancel viewing", cancelLabel: "Keep it" },
                  "Viewing cancelled"
                )
              }
              className={button({ variant: "danger-ghost", size: "sm" })}
            >
              Cancel viewing
            </button>
          )}
        </div>
      )}

      {requestActions(inspection).withdraw && (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(
                { status: "declined" },
                { title: "Withdraw your suggested time?", body: "This closes the request.", confirmLabel: "Withdraw" },
                "Request closed"
              )
            }
            className={button({ variant: "ghost", size: "sm" })}
          >
            Withdraw
          </button>
        </div>
      )}

      {canReview(inspection) && (
        <div className="mt-3 border-t border-line pt-3">
          {reviewed ? (
            <p className="text-sm text-ink-muted">You rated this visit.</p>
          ) : (
            <ReviewForm inspectionId={inspection.id} reviewing="tenant" name={name} onDone={onReviewed} />
          )}
        </div>
      )}

      {["pending", "countered", "confirmed"].includes(inspection.status) && !proposing && (
        <div className="mt-3 border-t border-line pt-3">
          <MessageButton
            listingId={inspection.listing_id}
            tenantId={inspection.tenant_id}
            user={user}
            label={`Message ${name?.split(" ")[0] || "them"}`}
            variant="ghost"
            size="sm"
          />
        </div>
      )}

      {proposing && (
        <form onSubmit={sendProposal} className="mt-4 flex flex-col gap-4 rounded-[var(--radius-control)] bg-cream p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="New date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Field label="New time" optional type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <Field
            label="Note to the home-seeker"
            optional
            placeholder="e.g. I'm only around on weekends"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={button({ size: "sm" })}>
              Send suggestion
            </button>
            <button type="button" onClick={() => setProposing(false)} className={button({ variant: "ghost", size: "sm" })}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
