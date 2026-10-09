import { StyleSheet, Text } from "react-native";
import { VIEWING_STATUS } from "@shared/viewings.js";
import { colors, fonts } from "@/theme";

const TONES = {
  neutral: { backgroundColor: "rgba(30,27,22,0.06)", color: colors.inkMuted },
  palm: { backgroundColor: colors.palmSoft, color: colors.palm },
  gold: { backgroundColor: colors.goldSoft, color: colors.goldInk },
  clay: { backgroundColor: colors.claySoft, color: colors.clay },
} as const;

// Viewing status pill, same labels and colours as the website.
export default function StatusBadge({ status }: { status: string }) {
  const s = (VIEWING_STATUS as Record<string, { tone: keyof typeof TONES; label: string }>)[status] || { tone: "neutral", label: status };
  const tone = TONES[s.tone];
  return <Text style={[styles.badge, { backgroundColor: tone.backgroundColor, color: tone.color }]}>{s.label}</Text>;
}

const styles = StyleSheet.create({
  badge: { fontFamily: fonts.sansSemi, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
});
