"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useSavedIds, toggleSaved } from "@/lib/saved";
import { toast } from "@/lib/toast";

export default function SaveButton({ id, className = "", withLabel = false }) {
  const saved = useSavedIds().includes(String(id));
  // Bumped on each save so the heart remounts and plays its pop again.
  const [pop, setPop] = useState(0);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!saved) setPop((n) => n + 1);
        toast(saved ? "Removed from saved" : "Saved to your homes", { tone: saved ? "info" : "success" });
        toggleSaved(id);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save this property"}
      className={`flex items-center justify-center gap-2 rounded-full transition-transform duration-200 active:scale-90 ${className}`}
    >
      <Heart
        key={pop}
        size={18}
        aria-hidden="true"
        className={`${saved ? "fill-clay text-clay" : "text-ink"} ${saved && pop ? "animate-heart-pop" : ""}`}
      />
      {withLabel && <span className="text-sm font-semibold">{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
