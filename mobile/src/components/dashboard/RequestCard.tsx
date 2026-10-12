import { useState } from "react";
import { reviewState } from "@/lib/reviews";
import ReviewSheet from "@/components/ReviewSheet";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarDays, Clock, MessageCircle, Star } from "lucide-react-native";
import { requestActions } from "@shared/lister.js";
import { formatDateTime } from "@shared/format.js";
import { moveInLabel, occupationLabel } from "@shared/profileDisplay.js";
import { friendlyError } from "@shared/errors.js";
import { openChat } from "@/lib/messagingApp";
import StatusBadge from "@/components/StatusBadge";
import { colors, fonts, radius } from "@/theme";

export type RequestRow = Record<string, any>;
type Person = { name: string; avatar: string | null } | null;
type Details = { occupation?: string | null; move_in_timeline?: string | null } | null;
type Rating = { average: number; total: number } | null;

type Props = {
  request: RequestRow;
  person: Person;
  details: Details;
  rating: Rating;
  online: boolean;
  onUpdate: (changes: Record<string, string | null>) => Promise<void>;
  onCounter: () => void;
  reviewed?: Set<string>;
  onReviewed?: () => void;
};

function ask(title: string, action: string, run: () => void) {
  Alert.alert(title, undefined, [
    { text: "Keep it", style: "cancel" },
    { text: action, style: "destructive", onPress: run },
  ]);
}

// One viewing request on the lister's Dashboard.
export default function RequestCard({ request: r, person, details, rating, online, onUpdate, onCounter, reviewed = new Set(), onReviewed }: Props) {
  const actions = requestActions(r);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const review = r.tenant_id ? reviewState(r as { id: string; status: string; preferred_date: string }, reviewed) : "not-yet";
  const name = r.tenant_id ? person?.name || "Home-seeker" : "Deleted user";
  const about = [occupationLabel(details?.occupation), moveInLabel(details?.move_in_timeline) && `Moving ${moveInLabel(details?.move_in_timeline).toLowerCase()}`]
    .filter(Boolean)
    .join(" · ");

  async function run(changes: Record<string, string | null>) {
    setBusy(true);
    setError("");
    try {
      await onUpdate(changes);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function message() {
    setError("");
    try {
      await openChat(String(r.listing_id), String(r.tenant_id));
    } catch (e) {
      setError(friendlyError(e));
    }
  }

  const disabled = busy || !online;

  return (
    <View style={[styles.card, r.status === "pending" && styles.pending]}>
      <View style={styles.top}>
        {person?.avatar ? (
          <Image source={{ uri: person.avatar }} style={styles.avatar} cachePolicy="disk" alt="" />
        ) : (
          <View style={[styles.avatar, styles.initial]}>
            <Text style={styles.initialText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <StatusBadge status={r.status} />
          </View>
          {rating?.total ? (
            <View style={styles.row}>
              <Star size={12} color={colors.gold} fill={colors.gold} />
              <Text style={styles.muted}>
                {Number(rating.average).toFixed(1)} · {rating.total} review{rating.total === 1 ? "" : "s"}
              </Text>
            </View>
          ) : null}
          {about ? <Text style={styles.muted}>{about}</Text> : null}
          <Pressable onPress={() => router.push({ pathname: "/listing/[id]", params: { id: String(r.listing_id) } })}>
            <Text style={styles.listing} numberOfLines={1}>
              {r.listings?.title || "Listing removed"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        <CalendarDays color={colors.palm} size={15} />
        <Text style={styles.date}>Requested for {formatDateTime(r.preferred_date, r.preferred_time)}</Text>
      </View>
      {r.status === "countered" && (
        <View style={styles.row}>
          <Clock color={colors.inkMuted} size={15} />
          <Text style={styles.muted}>You suggested {formatDateTime(r.proposed_date, r.proposed_time)}</Text>
        </View>
      )}
      {r.landlord_note && r.status !== "pending" ? <Text style={styles.muted}>Your note: “{r.landlord_note}”</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {review === "can-review" && (
        <Action label={`Rate ${(person?.name || "them").trim().split(/\s+/)[0]}`} disabled={!online} onPress={() => setReviewing(true)} />
      )}
      {review === "reviewed" && <Text style={styles.listing}>Rated. Thank you.</Text>}
      <ReviewSheet
        visible={reviewing}
        inspectionId={String(r.id)}
        reviewing="tenant"
        name={person?.name}
        onClose={() => setReviewing(false)}
        onDone={() => onReviewed?.()}
      />

      <View style={styles.actions}>
        {actions.confirm && <Action label="Confirm" primary disabled={disabled} onPress={() => run({ status: "confirmed" })} />}
        {actions.counter && <Action label="Suggest another time" disabled={disabled} onPress={onCounter} />}
        {actions.decline && (
          <Action label="Decline" danger disabled={disabled} onPress={() => ask("Decline this viewing request?", "Decline", () => run({ status: "declined" }))} />
        )}
        {actions.done && <Action label="Mark as viewed" disabled={disabled} onPress={() => run({ status: "done" })} />}
        {actions.cancel && (
          <Action
            label="Cancel viewing"
            danger
            disabled={disabled}
            onPress={() => ask("Cancel this viewing? The home-seeker will see it's been cancelled.", "Cancel it", () => run({ status: "declined" }))}
          />
        )}
        {actions.withdraw && (
          <Action
            label="Withdraw"
            disabled={disabled}
            onPress={() => ask("Withdraw your suggested time and close this request?", "Withdraw", () => run({ status: "declined" }))}
          />
        )}
        {r.tenant_id && ["pending", "countered", "confirmed"].includes(r.status) && (
          <Pressable accessibilityRole="button" accessibilityLabel="Message" disabled={!online} onPress={message} style={[styles.message, !online && styles.dim]}>
            <MessageCircle color={colors.palm} size={16} />
            <Text style={styles.link}>Message</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Action({ label, onPress, disabled, primary, danger }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, primary && styles.primary, danger && styles.danger, disabled && styles.dim]}
    >
      <Text style={[styles.actionText, primary && styles.primaryText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  pending: { borderColor: colors.gold },
  top: { flexDirection: "row", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.palm },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  listing: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.palm },
  date: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  action: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, borderWidth: 1, borderColor: colors.lineStrong },
  primary: { backgroundColor: colors.palm, borderColor: colors.palm },
  danger: { borderColor: colors.claySoft, backgroundColor: colors.claySoft },
  actionText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  primaryText: { color: colors.white },
  dangerText: { color: colors.clay },
  message: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6, paddingVertical: 8 },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  dim: { opacity: 0.5 },
});
