"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loginHref } from "@/lib/useUser";
import { REPORT_REASONS } from "@/lib/property";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { Flag, ShieldAlert } from "lucide-react";

// Tips shown on every listing, plus a way to flag it to Ile's moderators.
export default function ReportListing({ listing, user }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const isOwner = user && user.id === listing.landlord_id;

  async function submit(e) {
    e.preventDefault();
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    setState("sending");
    setError("");
    const { error: insertError } = await supabase.from("listing_reports").insert({
      listing_id: listing.id,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    });
    if (insertError) {
      setState("idle");
      setError(insertError.code === "23505" ? "You've already reported this listing. We're looking into it." : insertError.message);
      return;
    }
    setState("sent");
  }

  return (
    <section className="mt-10 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink">
        <ShieldAlert size={20} className="text-palm" aria-hidden="true" /> Stay safe
      </h2>
      <ul className="mt-3 space-y-2 text-sm text-ink-muted">
        <li>• Never pay an inspection fee, deposit or rent before you&apos;ve seen the property in person.</li>
        <li>• Meet at the property itself, ideally in daylight, and bring someone with you.</li>
        <li>• Keep chats on Ile so there&apos;s a record if anything goes wrong.</li>
        {listing.category === "land" && (
          <li>• For land, confirm the title document at the state land registry before paying anything.</li>
        )}
      </ul>

      {!isOwner && (
        <div className="mt-5 border-t border-line pt-4">
          {state === "sent" ? (
            <Alert tone="success">Thanks for reporting. Our team will review this listing.</Alert>
          ) : !open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay hover:underline"
            >
              <Flag size={15} aria-hidden="true" /> Report this listing
            </button>
          ) : !user ? (
            <p className="text-sm text-ink-muted">
              <Link href={loginHref(`/listings/${listing.id}`)} className="font-semibold text-palm hover:underline">
                Log in
              </Link>{" "}
              to report this listing. It helps us keep fake listings off Ile.
            </p>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink">What&apos;s wrong with this listing?</legend>
                <div className="flex flex-col gap-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-3.5 py-2.5 text-sm transition-colors ${
                        reason === r.value ? "border-clay bg-clay-soft text-ink" : "border-line text-ink hover:border-line-strong"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="mt-0.5 accent-[var(--color-clay)]"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field
                as="textarea"
                label="Anything else we should know?"
                optional
                rows={3}
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
              {error && <Alert>{error}</Alert>}
              <div className="flex gap-2">
                <button type="submit" disabled={state === "sending"} className={button({ variant: "danger", size: "sm" })}>
                  {state === "sending" ? "Sending…" : "Send report"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className={button({ variant: "ghost", size: "sm" })}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
