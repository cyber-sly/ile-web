"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { ArrowLeft, Copy } from "lucide-react";

// Monday-first for display; values match Postgres extract(dow): 0 = Sunday.
const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];
const LENGTHS = [15, 30, 45, 60];
const DEFAULT_WINDOW = { start: "10:00", end: "14:00" };

const hhmm = (t) => (t || "").slice(0, 5);
const timeInput =
  "h-10 rounded-[var(--radius-control)] border border-line-strong bg-surface px-2.5 text-sm text-ink outline-none focus:border-palm focus:ring-2 focus:ring-palm/25 disabled:opacity-40";

export default function ViewingTimesPage() {
  const { id } = useParams();
  const user = useUser();
  const [listing, setListing] = useState(undefined);
  const [days, setDays] = useState({}); // weekday -> { on, start, end }
  const [minutes, setMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: rows }] = await Promise.all([
        supabase.from("listings").select("id, title, landlord_id, viewing_slot_minutes").eq("id", id).maybeSingle(),
        supabase.from("listing_availability").select("weekday, start_time, end_time").eq("listing_id", id),
      ]);
      setListing(l ?? null);
      if (!l) return;
      setMinutes(l.viewing_slot_minutes || 30);
      const next = {};
      for (const w of WEEKDAYS) next[w.value] = { on: false, ...DEFAULT_WINDOW };
      for (const r of rows || []) next[r.weekday] = { on: true, start: hhmm(r.start_time), end: hhmm(r.end_time) };
      setDays(next);
    }
    load();
  }, [id]);

  const setDay = (weekday, changes) => setDays((d) => ({ ...d, [weekday]: { ...d[weekday], ...changes } }));

  function copyToAll(weekday) {
    const src = days[weekday];
    setDays((d) =>
      Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.on ? { ...v, start: src.start, end: src.end } : v]))
    );
  }

  async function save() {
    setMessage(null);
    const rows = WEEKDAYS.filter((w) => days[w.value]?.on).map((w) => ({
      listing_id: id,
      weekday: w.value,
      start_time: days[w.value].start,
      end_time: days[w.value].end,
    }));
    const bad = rows.find((r) => !r.start_time || !r.end_time || r.end_time <= r.start_time);
    if (bad) {
      setMessage({ tone: "error", text: "Each day's end time must be after its start time." });
      return;
    }

    setSaving(true);
    const { error: delError } = await supabase.from("listing_availability").delete().eq("listing_id", id);
    const { error: insError } = rows.length
      ? await supabase.from("listing_availability").insert(rows)
      : { error: null };
    const { error: updError } = await supabase.from("listings").update({ viewing_slot_minutes: minutes }).eq("id", id);
    const err = delError || insError || updError;
    if (err) {
      setSaving(false);
      setMessage({ tone: "error", text: err.message });
      return;
    }
    const { data: open } = await supabase.rpc("listing_open_slots", { p_listing: id, p_days: 14 });
    setSaving(false);
    setMessage({
      tone: "success",
      text: rows.length
        ? `Saved. ${open?.length || 0} open viewing slots in the next two weeks. Bookings are confirmed instantly and appear in your dashboard.`
        : "Saved. With no viewing times set, people will request a time and you confirm it.",
    });
  }

  if (user === undefined || listing === undefined) return <PageSkeleton />;

  if (!listing || !user || user.id !== listing.landlord_id) {
    return (
      <AccessWall
        title="You can only set viewing times on your own listings"
        primary={user ? { href: "/dashboard", label: "Back to dashboard" } : { href: `/login?next=/listings/${id}/viewings`, label: "Log in" }}
      >
        Log in with the account that posted this listing.
      </AccessWall>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-12">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" /> Dashboard
      </Link>
      <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">Viewing times</h1>
      <p className="mt-2 text-ink-muted">
        For <span className="font-semibold text-ink">{listing.title}</span>. Choose when you&apos;re free each week and
        home-seekers can book a slot that&apos;s confirmed straight away. Times are Nigeria time (WAT).
      </p>

      <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface">
        <ul className="divide-y divide-line">
          {WEEKDAYS.map((w) => {
            const d = days[w.value] || { on: false, ...DEFAULT_WINDOW };
            return (
              <li key={w.value} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
                <label className="flex w-32 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={d.on}
                    onChange={(e) => setDay(w.value, { on: e.target.checked })}
                    className="h-5 w-5 accent-[var(--color-palm)]"
                  />
                  <span className={`font-semibold ${d.on ? "text-ink" : "text-ink-muted"}`}>{w.label}</span>
                </label>
                {d.on ? (
                  <div className="flex flex-1 items-center gap-2">
                    <label>
                      <span className="sr-only">{w.label} start</span>
                      <input type="time" step={900} value={d.start} onChange={(e) => setDay(w.value, { start: e.target.value })} className={timeInput} />
                    </label>
                    <span className="text-ink-muted">to</span>
                    <label>
                      <span className="sr-only">{w.label} end</span>
                      <input type="time" step={900} value={d.end} onChange={(e) => setDay(w.value, { end: e.target.value })} className={timeInput} />
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToAll(w.value)}
                      title="Use these hours for every selected day"
                      className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-palm hover:bg-palm-soft"
                    >
                      <Copy size={13} aria-hidden="true" /> Copy to all
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-ink-muted">Not available</span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-4 sm:px-5">
          <span className="text-sm font-semibold text-ink">Each viewing lasts</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Slot length">
            {LENGTHS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={`h-9 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                  minutes === m ? "bg-palm text-white" : "border border-line-strong text-ink-muted hover:text-ink"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>
      </section>

      {message && (
        <Alert tone={message.tone} className="mt-4">
          {message.text}
        </Alert>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={save} disabled={saving} className={button({ size: "lg" })}>
          {saving ? "Saving…" : "Save viewing times"}
        </button>
        <Link href={`/listings/${id}`} className={button({ variant: "ghost", size: "lg" })}>
          View listing
        </Link>
      </div>
    </div>
  );
}
