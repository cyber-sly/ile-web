"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { amenitiesFor } from "@/lib/property";
import { MAX_AMENITIES, MAX_AMENITY } from "@shared/lister.js";

// Tick-box amenities for the listing's category, plus the lister's own.
// `value` is the list of chosen labels.
export default function AmenityPicker({ category, value, onChange, error }) {
  const [custom, setCustom] = useState("");
  const chosen = Array.isArray(value) ? value : [];
  const listed = amenitiesFor(category);
  const extras = chosen.filter((a) => !listed.includes(a));
  const full = chosen.length >= MAX_AMENITIES;

  function toggle(label) {
    onChange(chosen.includes(label) ? chosen.filter((a) => a !== label) : full ? chosen : [...chosen, label]);
  }

  function addCustom() {
    const label = custom.trim().slice(0, MAX_AMENITY);
    if (!label || full || chosen.some((a) => a.toLowerCase() === label.toLowerCase())) return;
    onChange([...chosen, label]);
    setCustom("");
  }

  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold text-ink">
        Amenities <span className="font-normal text-ink-muted">· Optional</span>
      </legend>
      <p className="mb-3 text-sm text-ink-muted">Tick everything the place has. People filter by these.</p>
      <div className="flex flex-wrap gap-2">
        {listed.map((label) => {
          const on = chosen.includes(label);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(label)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                on ? "border-palm bg-palm-soft text-palm" : "border-line-strong bg-surface text-ink hover:border-ink/30"
              }`}
            >
              {on && <Check size={14} aria-hidden="true" />} {label}
            </button>
          );
        })}
        {extras.map((label) => (
          <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-palm bg-palm-soft px-3 py-1.5 text-sm font-semibold text-palm">
            {label}
            <button type="button" onClick={() => toggle(label)} aria-label={`Remove ${label}`} className="rounded-full hover:text-ink">
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={custom}
          maxLength={MAX_AMENITY}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add your own, e.g. Rooftop terrace"
          aria-label="Add your own amenity"
          disabled={full}
          className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-palm focus:ring-2 focus:ring-palm/25"
        />
        <button type="button" onClick={addCustom} disabled={full || !custom.trim()} className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-control)] border border-palm px-3 text-sm font-semibold text-palm disabled:opacity-50">
          <Plus size={15} aria-hidden="true" /> Add
        </button>
      </div>
      {full && <p className="mt-2 text-sm text-ink-muted">You&apos;ve added the most amenities ({MAX_AMENITIES}).</p>}
      {error && <p className="mt-2 text-sm font-medium text-clay">{error}</p>}
    </fieldset>
  );
}
