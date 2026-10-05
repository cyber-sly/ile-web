"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { REPORT_REASONS, STATUS_LABELS, placeLabel, priceParts } from "@/lib/property";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { button } from "@/components/ui/Button";
import { ShieldCheck, ImageOff, ExternalLink, Trash2, RotateCcw, X } from "lucide-react";

const reasonLabel = (v) => REPORT_REASONS.find((r) => r.value === v)?.label || v;

function timeAgo(iso) {
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Reports grouped by listing, most-reported first.
async function loadQueue() {
  const [{ data: reports, error }, { data: removed }] = await Promise.all([
    supabase
      .from("listing_reports")
      .select("id, reason, details, created_at, reporter_id, listings(id, title, image_url, status, location, state, lga, area, price, price_period, listing_type)")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("id, title, image_url, status, location, state, lga, area, price, price_period, listing_type")
      .eq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (error) return { error: error.message, groups: [], removed: [] };

  const byListing = new Map();
  for (const r of reports || []) {
    if (!r.listings) continue;
    const g = byListing.get(r.listings.id) || { listing: r.listings, reports: [] };
    g.reports.push(r);
    byListing.set(r.listings.id, g);
  }
  const groups = [...byListing.values()].sort((a, b) => b.reports.length - a.reports.length);
  return { error: "", groups, removed: removed || [] };
}

function ListingSummary({ listing }) {
  const { amount, suffix } = priceParts(listing);
  return (
    <div className="flex min-w-0 gap-3">
      <span className="h-16 w-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-line">
        {listing.image_url ? (
          <img src={listing.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={20} className="m-5 text-ink-muted/50" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <Link href={`/listings/${listing.id}`} target="_blank" className="flex items-center gap-1 font-semibold text-ink hover:text-palm">
          <span className="truncate">{listing.title}</span> <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
        </Link>
        <p className="truncate text-sm text-ink-muted">
          {placeLabel(listing)} · {amount} {suffix}
        </p>
        <Badge tone={listing.status === "active" ? "palm" : "clay"} className="mt-1">
          {STATUS_LABELS[listing.status] || listing.status}
        </Badge>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const user = useUser();
  const [isAdmin, setIsAdmin] = useState(undefined);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(() => loadQueue().then(setData), []);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("is_admin").then(({ data: ok }) => {
      setIsAdmin(Boolean(ok));
      if (ok) refresh();
    });
  }, [user, refresh]);

  async function act(listingId, action) {
    if (action === "remove" && !window.confirm("Remove this listing? The lister won't be able to relist it.")) return;
    setBusy(listingId);
    setError("");
    const { error: rpcError } = await supabase.rpc("moderate_listing", { p_listing: listingId, p_action: action });
    setBusy(null);
    if (rpcError) setError(rpcError.message);
    else refresh();
  }

  if (user === undefined || (user && isAdmin === undefined)) return <PageSkeleton />;
  if (!user) return <AccessWall title="Admins only" primary={{ href: "/login?next=/admin", label: "Log in" }} />;
  if (!isAdmin) {
    return (
      <AccessWall title="Admins only" primary={{ href: "/", label: "Go home" }}>
        This page is for Ile moderators.
      </AccessWall>
    );
  }
  if (!data) return <PageSkeleton />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">Moderation</h1>
      <p className="mt-2 text-ink-muted">
        Reported listings, most-reported first. Three reports from different people hide a listing automatically.
      </p>
      {(error || data.error) && <Alert className="mt-6">{error || data.error}</Alert>}

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold text-ink">Open reports ({data.groups.length})</h2>
        {data.groups.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={ShieldCheck} title="Nothing to review">
              New reports from users will appear here.
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {data.groups.map(({ listing, reports }) => (
              <li key={listing.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <ListingSummary listing={listing} />
                  <Badge tone="clay">
                    {reports.length} report{reports.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {reports.map((r) => (
                    <li key={r.id} className="text-sm">
                      <span className="font-semibold text-ink">{reasonLabel(r.reason)}</span>
                      <span className="text-ink-muted"> · {timeAgo(r.created_at)}</span>
                      {r.details && <p className="mt-0.5 text-ink-muted">&ldquo;{r.details}&rdquo;</p>}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busy === listing.id} onClick={() => act(listing.id, "remove")} className={button({ variant: "danger", size: "sm" })}>
                    <Trash2 size={14} aria-hidden="true" /> Remove listing
                  </button>
                  <button type="button" disabled={busy === listing.id} onClick={() => act(listing.id, "dismiss")} className={button({ variant: "neutral", size: "sm" })}>
                    <X size={14} aria-hidden="true" /> Dismiss reports
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-ink">Removed listings</h2>
        {data.removed.length === 0 ? (
          <p className="mt-3 text-ink-muted">No removed listings.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {data.removed.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4">
                <ListingSummary listing={l} />
                <button type="button" disabled={busy === l.id} onClick={() => act(l.id, "restore")} className={button({ variant: "neutral", size: "sm" })}>
                  <RotateCcw size={14} aria-hidden="true" /> Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
