import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Minus, Plus, Rocket, X } from "lucide-react-native";
import { friendlyError } from "@shared/errors.js";
import { formatDate } from "@shared/format.js";
import { spendBoostDays } from "@/lib/referrals";
import { Button } from "@/components/kit";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";
import Animated, { SlideInDown } from "react-native-reanimated";
import { successHaptic } from "@/lib/haptics";

const dayWord = (n: number) => (n === 1 ? "day" : "days");

// Spend boost days to put a listing first in search and "Fresh on Ile".
export default function BoostSheet({
  listing,
  balance,
  onDone,
  onClose,
}: {
  listing: { id: string; title: string } | null;
  balance: number;
  onDone: (listingId: string, until: string) => void;
  onClose: () => void;
}) {
  const max = Math.min(30, balance);
  const [days, setDays] = useState(Math.max(1, Math.min(7, max)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [until, setUntil] = useState<string | null>(null);

  function close() {
    setUntil(null);
    setError("");
    onClose();
  }

  async function boost() {
    if (!listing) return;
    setBusy(true);
    setError("");
    try {
      const newUntil = await spendBoostDays(String(listing.id), days);
      setUntil(newUntil);
      successHaptic();
      onDone(String(listing.id), newUntil);
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  return (
    <Modal visible={listing !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Tap feedback={false} style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      <Animated.View entering={SlideInDown.duration(260)} style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Boost this listing
          </Text>
          <Tap accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={close}>
            <X color={colors.inkMuted} size={22} />
          </Tap>
        </View>
        <Text style={styles.muted} numberOfLines={1}>
          {listing?.title}
        </Text>
        {until ? (
          <Text style={styles.done}>Boosted until {formatDate(String(until).slice(0, 10))}.</Text>
        ) : max < 1 ? (
          <Text style={styles.muted}>You don&apos;t have any boost days yet. Invite listers and home-seekers with your code to earn some.</Text>
        ) : (
          <>
            <Text style={styles.muted}>
              Boosted listings show first in search and on the home page. You have {balance} boost {dayWord(balance)}.
            </Text>
            <View style={styles.stepper}>
              <Tap
                accessibilityRole="button"
                accessibilityLabel="Fewer days"
                disabled={days <= 1}
                onPress={() => setDays((d) => Math.max(1, d - 1))}
                style={[styles.step, days <= 1 && styles.dim]}
              >
                <Minus color={colors.ink} size={18} />
              </Tap>
              <Text style={styles.days} accessibilityLiveRegion="polite">
                {days} {dayWord(days)}
              </Text>
              <Tap
                accessibilityRole="button"
                accessibilityLabel="More days"
                disabled={days >= max}
                onPress={() => setDays((d) => Math.min(max, d + 1))}
                style={[styles.step, days >= max && styles.dim]}
              >
                <Plus color={colors.ink} size={18} />
              </Tap>
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label={busy ? "Boosting…" : `Boost for ${days} ${dayWord(days)}`} icon={Rocket} loading={busy} onPress={boost} />
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(30,27,22,0.4)" },
  sheet: {
    gap: 12,
    padding: 20,
    paddingBottom: 36,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  done: { padding: 14, borderRadius: radius.control, backgroundColor: colors.palmSoft, fontFamily: fonts.sansSemi, fontSize: 15, color: colors.palm },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, paddingVertical: 4 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  dim: { opacity: 0.4 },
  days: { minWidth: 96, textAlign: "center", fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
