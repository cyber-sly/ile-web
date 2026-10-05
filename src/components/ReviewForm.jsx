"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { StarInput } from "@/components/Stars";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { Star } from "lucide-react";

// Collapsed "Leave a review" prompt that opens into the form.
// `reviewing` is "lister" (home-seeker rates the lister) or "tenant".
export default function ReviewForm({ inspectionId, reviewing, name, onDone }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [accurate, setAccurate] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLister = reviewing === "lister";
  const who = name?.split(" ")[0] || (isLister ? "the lister" : "them");

  async function submit(e) {
    e.preventDefault();
    if (!rating) {
      setError("Choose a star rating.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("leave_review", {
      p_inspection: inspectionId,
      p_rating: rating,
      p_comment: comment,
      p_accurate: isLister ? accurate : null,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onDone?.();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button({ variant: "secondary", size: "sm" })}>
        <Star size={15} aria-hidden="true" /> {isLister ? `Review ${who}` : `Rate ${who}`}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[var(--radius-control)] bg-cream p-4">
      <StarInput value={rating} onChange={setRating} label={isLister ? `How was viewing with ${who}?` : `How was ${who} as a visitor?`} />
      {isLister && (
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Did the property match the listing?</legend>
          <div className="flex gap-2">
            {[
              { v: true, label: "Yes" },
              { v: false, label: "No" },
            ].map((o) => (
              <label
                key={o.label}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm ${
                  accurate === o.v
                    ? o.v
                      ? "border-palm bg-palm-soft text-palm"
                      : "border-clay bg-clay-soft text-clay"
                    : "border-line-strong text-ink-muted hover:text-ink"
                }`}
              >
                <input type="radio" name="accurate" checked={accurate === o.v} onChange={() => setAccurate(o.v)} className="sr-only" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <Field
        as="textarea"
        label={isLister ? "Tell others about your experience" : "Notes for other listers"}
        optional
        rows={3}
        maxLength={1000}
        placeholder={isLister ? "Was the lister on time? Were the photos accurate?" : "Did they turn up on time? Were they respectful?"}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={button({ size: "sm" })}>
          {busy ? "Posting…" : "Post review"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button({ variant: "ghost", size: "sm" })}>
          Cancel
        </button>
      </div>
      <p className="text-xs text-ink-muted">Reviews can&apos;t be edited after posting.</p>
    </form>
  );
}
