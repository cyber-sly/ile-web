// Class builder rather than a component, so the same styles work on <button>,
// <Link> and <a> without wrapping each one.
//   <Link href="/x" className={button({ variant: "secondary", size: "sm" })}>

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm";

const variants = {
  primary: "bg-palm text-white hover:bg-palm-dark",
  secondary: "border border-palm text-palm bg-transparent hover:bg-palm-soft",
  neutral: "border border-line-strong bg-surface text-ink hover:border-ink/30",
  ghost: "text-ink-muted hover:bg-ink/5 hover:text-ink",
  danger: "bg-clay text-white hover:bg-clay/90",
  "danger-ghost": "text-clay hover:bg-clay-soft",
  onDark: "bg-surface text-ink hover:bg-white",
};

const sizes = {
  sm: "h-9 rounded-[var(--radius-control)] px-3.5 text-sm",
  md: "h-11 rounded-[var(--radius-control)] px-5 text-sm",
  lg: "h-12 rounded-[var(--radius-control)] px-6 text-base",
  icon: "h-11 w-11 rounded-full",
};

export function button({ variant = "primary", size = "md", full = false, className = "" } = {}) {
  return [base, variants[variant], sizes[size], full ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}
