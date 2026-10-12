import { useState } from "react";
import { reviewState } from "@/lib/reviews";
import ReviewSheet from "@/components/ReviewSheet";
import { friendlyError } from "@shared/errors.js";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarDays, Clock, ImageOff, MessageCircle } from "lucide-react-native";
import { viewingActions } from "@shared/viewings.js";
import { formatDateTime } from "@shared/format.js";
import { placeLabel } from "@shared/property.js";
import { openChat } from "@/lib/messagingApp";
import { StatusBadge } from "@/components/kit";
import Button from "@/components/Button";
import { colors, fonts, radius } from "@/theme";

export type ViewingRow = Record<string, any>;

type Props = {
  viewing: ViewingRow;
  online: boolean;
  onAccept: (v: ViewingRow) => Promise<void>;
  onUpdate: (v: ViewingRow, changes: Record<string, string>) => Promise<void>;
  reviewed?: Set<string>;
  onReviewed?: () => void;
};

function confirm(title: string, message: string, action: string, run: () => void) {
  Alert.alert(title, message, [
    { text: "Keep it", style: "cancel" },
    { text: action, style: "destructive", onPress: run },
  ]);
}

// One viewing on the Viewings tab, with the actions that apply to it.
export default function ViewingCard({ viewing: v, online, onAccept, onUpdate, reviewed, onReviewed }: Props) {
  const l = v.listings;
  const actions = viewingActions(v);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const review = reviewState(v as { id: string; status: string; preferred_date: string }, reviewed);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.card, v.status === "countered" && styles.countered]}>
      <Pressable
        accessibilityRole="button"
        disabled={!l}
        onPress={() => l && router.push({ pathname: "/listing/[id]", params: { id: String(l.id) } })}
        style={styles.top}
      >
        {l?.image_url ? (
          <Image source={{ uri: l.image_url }} style={styles.photo} cachePolicy="disk" alt="" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <ImageOff color={colors.inkMuted} size={20} />
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.badgeRow}>
            <StatusBadge status={v.status} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {l?.title || "Listing removed"}
          </Text>
          {l && (
            <Text style={styles.muted} numberOfLines={1}>
              {placeLabel(l)}
            </Text>
          )}
          <View style={styles.row}>
            <CalendarDays color={colors.palm} size={15} />
            <Text style={styles.date}>{formatDateTime(v.preferred_date, v.preferred_time)}</Text>
          </View>
        </View>
      </Pressable>

      {v.status === "countered" && (
        <View style={styles.counter}>
          <View style={styles.row}>
            <Clock color={colors.goldInk} size={16} />
            <Text style={styles.counterText}>The lister suggested {formatDateTime(v.proposed_date, v.proposed_time)}</Text>
          </View>
          {v.landlord_note ? <Text style={styles.muted}>“{v.landlord_note}”</Text> : null}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {review === "can-review" && l && (
        <View style={styles.reviewRow}>
          <Button label="Review the lister" variant="secondary" disabled={!online} onPress={() => setReviewing(true)} />
        </View>
      )}
      {review === "reviewed" && <Text style={styles.reviewed}>Reviewed. Thank you.</Text>}
      <ReviewSheet
        visible={reviewing}
        inspectionId={String(v.id)}
        reviewing="lister"
        onClose={() => setReviewing(false)}
        onDone={() => onReviewed?.()}
      />

      {(actions.accept || actions.cancel || (actions.message && l)) && (
        <View style={styles.actions}>
          {actions.accept && (
            <View style={styles.flex}>
              <Button label="Accept new time" loading={busy} disabled={!online} onPress={() => run(() => onAccept(v))} />
            </View>
          )}
          {actions.decline && (
            <View style={styles.flex}>
              <Button
                label="Decline"
                variant="secondary"
                disabled={!online || busy}
                onPress={() =>
                  confirm("Decline the suggested time?", "This closes the request.", "Decline", () =>
                    run(() => onUpdate(v, { status: "declined" }))
                  )
                }
              />
            </View>
          )}
          {actions.message && l && !actions.accept && (
            <Pressable
              accessibilityRole="button"
              disabled={!online}
              onPress={() => run(() => openChat(String(l.id)))}
              style={[styles.messageButton, !online && styles.dim]}
            >
              <MessageCircle color={colors.palm} size={16} />
              <Text style={styles.link}>Message</Text>
            </Pressable>
          )}
          {actions.cancel && (
            <Pressable
              accessibilityRole="button"
              disabled={!online || busy}
              onPress={() =>
                confirm(
                  v.status === "pending" ? "Cancel this viewing request?" : "Cancel this viewing?",
                  v.status === "pending" ? "The lister won't see it any more." : "The lister will see it's cancelled.",
                  "Cancel it",
                  () => run(() => onUpdate(v, { status: "cancelled" }))
                )
              }
              style={[styles.cancelButton, (!online || busy) && styles.dim]}
            >
              <Text style={styles.cancel}>{v.status === "pending" ? "Cancel request" : "Cancel viewing"}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  countered: { borderColor: colors.gold },
  top: { flexDirection: "row", gap: 12, padding: 14 },
  photo: { width: 88, height: 72, borderRadius: radius.control, backgroundColor: colors.line },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  badgeRow: { flexDirection: "row" },
  title: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  counter: { gap: 4, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.goldSoft },
  counterText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay, paddingHorizontal: 14, paddingTop: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.line },
  flex: { flex: 1, minWidth: 130 },
  messageButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 4 },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  cancelButton: { marginLeft: "auto", paddingVertical: 8, paddingHorizontal: 4 },
  cancel: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.clay },
  dim: { opacity: 0.5 },
  reviewRow: { paddingHorizontal: 14, paddingBottom: 12 },
  reviewed: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.palm, paddingHorizontal: 14, paddingBottom: 12 },
});
