import { stateLabel } from "@shared/nigeria.js";
import { titleShort, typeLabel } from "@shared/property.js";
import { formatNairaShort } from "@shared/format.js";
import type { Filters } from "@/lib/filters";

export type FilterChip = { key: string; label: string };

const LABELS: Record<string, (v: string) => string> = {
  state: (v) => stateLabel(v),
  lga: (v) => v,
  ptype: (v) => typeLabel(v),
  purpose: (v) => (v === "sale" ? "For sale" : "For rent"),
  min: (v) => `From ${formatNairaShort(v)}`,
  max: (v) => `Up to ${formatNairaShort(v)}`,
  beds: (v) => `${v}+ beds`,
  title: (v) => titleShort(v) || v,
};

// The filters applied on the search screen, as removable chips (tab, search
// text and sort have their own controls).
export function activeFilterChips(filters: Filters): FilterChip[] {
  return Object.keys(LABELS)
    .filter((key) => filters[key])
    .map((key) => ({ key, label: LABELS[key](filters[key]) }));
}
