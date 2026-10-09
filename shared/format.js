// Display helpers shared across pages, so prices and dates read the same everywhere.

export function formatNaira(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₦—";
  return `₦${n.toLocaleString("en-NG")}`;
}

// "₦2.4m", "₦850k" — for tight spaces like map pins and phone cards.
export function formatNairaShort(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "₦—";
  if (n >= 1_000_000_000) return `₦${trim(n / 1_000_000_000)}bn`;
  if (n >= 1_000_000) return `₦${trim(n / 1_000_000)}m`;
  if (n >= 1_000) return `₦${trim(n / 1_000)}k`;
  return `₦${n}`;
}

function trim(n) {
  return n.toFixed(1).replace(/\.0$/, "");
}

// "2026-10-12" -> "Sat, 12 Oct 2026". Parsed as a local date so it never shifts a day.
export function formatDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "14:00:00" -> "2:00 pm"
export function formatTime(time) {
  if (!time) return "";
  const [h, min] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(date, time) {
  return time ? `${formatDate(date)} at ${formatTime(time)}` : formatDate(date);
}

export function pluralize(count, word) {
  return `${count} ${word}${Number(count) === 1 ? "" : "s"}`;
}
