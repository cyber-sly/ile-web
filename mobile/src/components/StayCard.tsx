import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { friendlyError } from "@shared/errors.js";
import { formatDate, formatNaira } from "@shared/format.js";
import { cancelStay, lagosToday, respondStay, STAY_STATUS, stayActions, type StayRow } from "@/lib/stays";
import { openChat } from "@/lib/messagingApp";
import ReviewSheet from "@/components/ReviewSheet";
import Tap from "@/components/kit/Tap";
import { Badge, Button } from "@/components/kit";
import { colors, fonts, radius } from "@/theme";

const TONES: Record<string, "gold" | "palm" | "clay" | "neutral"> = { requested: "gold", accepted: "palm", declined: "clay", cancelled: "neutral" };

// One stay booking, for the host (accept/decline/cancel/message) or the
// guest (cancel/message/review).
export default function StayCard({
  stay: s,
  role,
  personName,
  reviewed,
  onChanged,
}: {
  stay: StayRow;
  role: "host" | "guest";
  personName?: string | null;
  reviewed: boolean;
  onChanged: () => void;
}) {
  const actions = stayActions(s, role, lagosToday());
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = personName || (role === "host" ? "the guest" : "the host");

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
      setDeclining(false);
      onChanged();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
  }

  function confirmCancel() {
    Alert.alert("Cancel this stay?", "The other person will be told.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel stay", style: "destructive", onPress: () => run(() => cancelStay(String(s.id))) },
    ]);
  }

  async function message() {
    try {
      await openChat(String(s.listing_id), role === "host" ? String(s.guest_id) : undefined);
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Tap accessibilityRole="link" style={styles.flex} onPress={() => router.push({ pathname: "/listing/[id]", params: { id: String(s.listing_id) } })}>
          <Text style={styles.title} numberOfLines={1}>
            {s.listings?.title || "Listing"}
          </Text>
        </Tap>
        <Badge tone={TONES[s.status]}>{STAY_STATUS[s.status as keyof typeof STAY_STATUS]?.label}</Badge>
      </View>
      <Text style={styles.muted}>
        {formatDate(s.check_in)} – {formatDate(s.check_out)} · {s.nights} {s.nights === 1 ? "night" : "nights"} · {s.guests}{" "}
        {s.guests === 1 ? "guest" : "guests"}
      </Text>
      <Text style={styles.line}>
        {role === "host" && personName ? (
          <Text accessibilityRole="link" style={styles.link} onPress={() => router.push({ pathname: "/u/[id]", params: { id: String(s.guest_id) } })}>
            {personName}
          </Text>
        ) : null}
        {role === "host" && personName ? " · " : ""}
        <Text style={styles.strong}>{formatNaira(s.total)}</Text> total
      </Text>
      {s.note ? <Text style={styles.note}>“{s.note}”</Text> : null}
      {s.status === "declined" && s.decline_reason ? <Text style={styles.muted}>Reason: {s.decline_reason}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {declining ? (
        <View style={styles.decline}>
          <TextInput
            value={reason}
            onChangeText={setReason}
            maxLength={200}
            placeholder="Reason (optional), e.g. Those dates aren't free"
            placeholderTextColor={colors.inkMuted}
            accessibilityLabel="Reason for declining"
            style={styles.input}
          />
          <View style={styles.row}>
            <Button label="Decline request" variant="danger" size="sm" full={false} loading={busy} onPress={() => run(() => respondStay(String(s.id), false, reason))} />
            <Button label="Keep it" variant="ghost" size="sm" full={false} onPress={() => setDeclining(false)} />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          {actions.accept && <Button label="Accept" size="sm" full={false} loading={busy} onPress={() => run(() => respondStay(String(s.id), true, ""))} />}
          {actions.decline && <Button label="Decline" variant="neutral" size="sm" full={false} disabled={busy} onPress={() => setDeclining(true)} />}
          {actions.cancel && <Button label="Cancel stay" variant="danger-ghost" size="sm" full={false} disabled={busy} onPress={confirmCancel} />}
          {actions.review && !reviewed && (
            <Button label={`Review ${personName || (role === "host" ? "guest" : "host")}`} variant="secondary" size="sm" full={false} onPress={() => setReviewing(true)} />
          )}
          <Button label="Message" variant="ghost" size="sm" full={false} onPress={message} />
        </View>
      )}
      {actions.review && (
        <ReviewSheet
          visible={reviewing}
          stayId={String(s.id)}
          reviewing={role === "host" ? "tenant" : "lister"}
          name={name}
          onClose={() => setReviewing(false)}
          onDone={onChanged}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  title: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  line: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  strong: { fontFamily: fonts.sansBold },
  link: { fontFamily: fonts.sansSemi, color: colors.palm },
  note: { padding: 10, borderRadius: radius.control, backgroundColor: colors.cream, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
  decline: { gap: 8, marginTop: 4 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
});
