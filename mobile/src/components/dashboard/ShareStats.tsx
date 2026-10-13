import { StyleSheet, Text, View } from "react-native";
import { Rocket } from "lucide-react-native";
import { seekerProgress, statsLine } from "@shared/referrals.js";
import type { ReferralSummary } from "@/lib/referrals";
import { colors, fonts, radius, shadows } from "@/theme";

// What sharing has brought in, and boost days to spend. Nothing until the
// referral feature is set up in the database.
export default function ShareStats({ summary }: { summary: ReferralSummary | null }) {
  if (!summary) return null;
  const { toNext } = seekerProgress(summary.seekers_confirmed);
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Rocket color={colors.palm} size={20} />
      </View>
      <View style={styles.text}>
        <Text style={styles.line}>{statsLine(summary)}</Text>
        <Text style={styles.muted}>
          {toNext} more home-seekers to your next 3 boost days. Your code: <Text style={styles.code}>{summary.code}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  text: { flex: 1, gap: 4 },
  line: { fontFamily: fonts.sansSemi, fontSize: 15, lineHeight: 21, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.inkMuted },
  code: { fontFamily: fonts.sansBold, color: colors.ink },
});
