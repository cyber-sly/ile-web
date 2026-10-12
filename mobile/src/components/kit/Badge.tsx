import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BadgeCheck, Sparkles, Zap, type LucideIcon } from "lucide-react-native";
import { VIEWING_STATUS } from "@shared/viewings.js";
import { colors, fonts } from "@/theme";

// Small status pill (website ui/Badge.jsx). Colour is never the only signal:
// every tone pairs with text.
export type Tone = "neutral" | "palm" | "gold" | "clay" | "solid" | "sale" | "overlay";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "rgba(30,27,22,0.05)", fg: colors.inkMuted },
  palm: { bg: colors.palmSoft, fg: colors.palm },
  gold: { bg: colors.goldSoft, fg: colors.goldInk },
  clay: { bg: colors.claySoft, fg: colors.clay },
  solid: { bg: colors.palm, fg: colors.white },
  sale: { bg: colors.sale, fg: colors.white },
  overlay: { bg: "rgba(255,253,248,0.95)", fg: colors.ink },
};

export function Badge({ tone = "neutral", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {Icon ? <Icon size={12} color={t.fg} /> : null}
      <Text style={[styles.text, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function ListingTypeBadge({ type }: { type?: string | null }) {
  return type === "sale" ? <Badge tone="sale">For sale</Badge> : <Badge tone="solid">For rent</Badge>;
}

export function VerifiedBadge() {
  return (
    <Badge tone="palm" icon={BadgeCheck}>
      Verified
    </Badge>
  );
}

export function BoostedBadge() {
  return (
    <Badge tone="gold" icon={Zap}>
      Boosted
    </Badge>
  );
}

export function ServicedBadge() {
  return (
    <Badge tone="palm" icon={Sparkles}>
      Serviced
    </Badge>
  );
}

// Viewing status, same labels and colours as the website.
export function StatusBadge({ status }: { status: string }) {
  const s = (VIEWING_STATUS as Record<string, { tone: Tone; label: string }>)[status] || { tone: "neutral" as Tone, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontFamily: fonts.sansSemi, fontSize: 12 },
});
