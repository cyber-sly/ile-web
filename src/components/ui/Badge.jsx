import { BadgeCheck, Zap } from "lucide-react";

// Small status pill. Colour is never the only signal: every tone pairs with text.
const tones = {
  neutral: "bg-ink/5 text-ink-muted",
  palm: "bg-palm-soft text-palm",
  gold: "bg-gold-soft text-gold-ink",
  clay: "bg-clay-soft text-clay",
  solid: "bg-palm text-white",
  sale: "bg-ink text-white",
  overlay: "bg-surface/95 text-ink shadow-sm backdrop-blur",
};

export default function Badge({ tone = "neutral", icon: Icon, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {Icon && <Icon size={13} aria-hidden="true" strokeWidth={2.4} />}
      {children}
    </span>
  );
}

// Lister has passed the paid ID/ownership check. Rendered only when the
// listing data says so (verification ships with payments).
export function VerifiedBadge({ className = "" }) {
  return (
    <Badge tone="palm" icon={BadgeCheck} className={className}>
      Verified
    </Badge>
  );
}

// Listing is currently boosted (paid placement).
export function BoostedBadge({ className = "" }) {
  return (
    <Badge tone="gold" icon={Zap} className={className}>
      Boosted
    </Badge>
  );
}

export function ListingTypeBadge({ type, className = "" }) {
  return type === "sale" ? (
    <Badge tone="sale" className={className}>
      For sale
    </Badge>
  ) : (
    <Badge tone="solid" className={className}>
      For rent
    </Badge>
  );
}

// Inspection lifecycle (see supabase/inspections_booking_flow.sql).
const STATUS = {
  pending: { tone: "gold", label: "Awaiting reply" },
  countered: { tone: "clay", label: "New time proposed" },
  confirmed: { tone: "palm", label: "Confirmed" },
  declined: { tone: "neutral", label: "Declined" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  done: { tone: "neutral", label: "Viewed" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || { tone: "neutral", label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
