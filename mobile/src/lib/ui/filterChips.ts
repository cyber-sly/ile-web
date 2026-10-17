import { stateLabel } from "@shared/nigeria.js";
import { titleShort, typeLabel } from "@shared/property.js";
import { formatNairaShort } from "@shared/format.js";
import { LAND_TYPE, stayDates } from "@shared/search.js";
import type { Filters } from "@/lib/filters";

export type FilterChip = { key: string; label: string };

const LABELS: Record<string, (v: string) => string> = {
  state: (v) => stateLabel(v),
  lga: (v) => v,
  ptype: (v) => (v === LAND_TYPE ? "Land" : typeLabel(v)),
  purpose: (v) => (v === "sale" ? "For sale" : "For rent"),
  min: (v) => `From ${formatNairaShort(v)}`,
  max: (v) => `Up to ${formatNairaShort(v)}`,
  beds: (v) => `${v}+ beds`,
  title: (v) => titleShort(v) || v,
  guests: (v) => `${v}+ ${v === "1" ? "guest" : "guests"}`,
  amen: (v) => v.split(",").filter(Boolean).join(", "),
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "2026-11-05" -> "5 Nov"
const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;

// Removing a chip clears these filters (the dates chip clears both dates).
export function chipClears(key: string): Filters {
  return key === "checkin" ? { checkin: "", checkout: "" } : { [key]: "" };
}

// The filters applied on the search screen, as removable chips (tab, search
// text and sort have their own controls).
export function activeFilterChips(filters: Filters): FilterChip[] {
  const chips = Object.keys(LABELS)
    .filter((key) => filters[key])
    .map((key) => ({ key, label: LABELS[key](filters[key]) }));
  const dates = stayDates(filters);
  if (dates) chips.push({ key: "checkin", label: `${shortDate(dates.checkIn)} – ${shortDate(dates.checkOut)}` });
  return chips;
}
