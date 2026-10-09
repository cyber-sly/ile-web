import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";

// Tinted icon tiles used across account settings.
const TONES = {
  palm: "bg-palm-soft text-palm",
  gold: "bg-gold-soft text-gold-ink",
  clay: "bg-clay-soft text-clay",
  rose: "bg-[#FBE7E7] text-[#B4232A]",
  sky: "bg-[#E4EEF8] text-[#1F5C99]",
  ink: "bg-ink/[0.06] text-ink",
};

export function IconTile({ icon: Icon, tone = "palm", size = "md" }) {
  const box = size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-[10px]";
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${TONES[tone]}`}>
      <Icon size={size === "lg" ? 21 : 18} strokeWidth={2.1} aria-hidden="true" />
    </span>
  );
}

// A group of rows under a small heading, in one rounded card.
export function SettingsGroup({ title, children }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-ink-muted">{title}</h2>}
      <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {children}
      </div>
    </section>
  );
}

// One settings row: icon, label, optional description, then a badge or
// chevron. Renders a Link (href), an external link (external), or a button.
export default function SettingsRow({
  icon,
  tone,
  label,
  description,
  href,
  external = false,
  onClick,
  badge,
  expanded,
  danger = false,
  disabled = false,
}) {
  const content = (
    <>
      <IconTile icon={icon} tone={danger ? "clay" : tone} />
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${danger ? "text-clay" : "text-ink"}`}>{label}</span>
        {description && <span className="block text-sm text-ink-muted">{description}</span>}
      </span>
      {badge > 0 && (
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-clay px-1.5 text-xs font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {expanded === undefined ? (
        <ChevronRight size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
      ) : (
        <ChevronDown size={18} className={`shrink-0 text-ink-muted transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      )}
    </>
  );
  const cls = "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink/[0.03] disabled:opacity-50";

  if (href && external) {
    return (
      <a href={href} className={cls}>
        {content}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-expanded={expanded} className={cls}>
      {content}
    </button>
  );
}
