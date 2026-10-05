"use client";

import { Heart } from "lucide-react";
import { useSavedIds, toggleSaved } from "@/lib/saved";

export default function SaveButton({ id, className = "", withLabel = false }) {
  const saved = useSavedIds().includes(String(id));

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(id);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this property"}
      className={`flex items-center justify-center gap-2 rounded-full transition-transform duration-200 active:scale-90 ${className}`}
    >
      <Heart
        size={18}
        aria-hidden="true"
        className={saved ? "fill-clay text-clay" : "text-ink"}
      />
      {withLabel && <span className="text-sm font-semibold">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
