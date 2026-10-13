import { Share, StyleSheet, Text, View } from "react-native";
import { Gift, Share2, Ticket } from "lucide-react-native";
import { inviteMessage, SITE, type ReferralSummary } from "@/lib/referrals";
import { Button } from "@/components/kit";
import { colors, fonts, radius, shadows } from "@/theme";

// "Your invite code: TUNDE7" with Invite a lister / Share code. Nothing until
// the referral feature is set up in the database.
export default function InviteCard({ summary }: { summary: ReferralSummary | null }) {
  if (!summary?.code) return null;
  const code = summary.code;

  async function invite() {
    try {
      await Share.share({ message: inviteMessage({ site: SITE, code }) });
    } catch {}
  }

  // The phone's share sheet has "Copy" on both Android and iPhone.
  async function shareCode() {
    try {
      await Share.share({ message: code });
    } catch {}
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Gift color={colors.goldInk} size={20} />
        </View>
        <View>
          <Text style={styles.label}>Your invite code</Text>
          <Text style={styles.code}>{code}</Text>
        </View>
      </View>
      <Text style={styles.muted}>
        Earn 7 boost days for every lister who joins with your code and lists a property, and 3 days for every 5 home-seekers.
      </Text>
      <View style={styles.buttons}>
        <Button label="Invite a lister" size="md" full={false} icon={Share2} onPress={invite} />
        <Button label="Share code" variant="neutral" size="md" full={false} icon={Ticket} onPress={shareCode} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...shadows.card },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.goldSoft },
  label: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  code: { fontFamily: fonts.serif, fontSize: 24, letterSpacing: 1, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
