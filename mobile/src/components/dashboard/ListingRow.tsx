import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ImageOff } from "lucide-react-native";
import { listingActions, takenStatus } from "@shared/lister.js";
import { isAvailable, isExpired, isModerated, placeLabel, priceParts, STATUS_LABELS } from "@shared/property.js";
import { friendlyError } from "@shared/errors.js";
import { colors, fonts, radius } from "@/theme";

export type ListingRowData = Record<string, any>;

type Props = {
  listing: ListingRowData;
  online: boolean;
  onUpdate: (changes: Record<string, string>) => Promise<void>;
  onDelete: () => Promise<void>;
};

const confirmNow = () => ({ last_confirmed_at: new Date().toISOString() });

// One of the lister's listings on the Dashboard, with its actions.
export default function ListingRow({ listing: l, online, onUpdate, onDelete }: Props) {
  const actions = listingActions(l);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { amount, suffix } = priceParts(l, { short: true });
  const taken = takenStatus(l);
  const cover = l.image_urls?.[0] || l.image_url;

  let statusLine = "Live";
  let statusTone: "palm" | "muted" | "gold" | "clay" = "palm";
  if (!isAvailable(l)) {
    statusLine = `${STATUS_LABELS[l.status as keyof typeof STATUS_LABELS] || l.status} · hidden from search`;
    statusTone = isModerated(l) ? "clay" : "muted";
  } else if (isExpired(l)) {
    statusLine = "Not confirmed · hidden from search";
    statusTone = "gold";
  }

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

  const disabled = busy || !online;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: "/listing/[id]", params: { id: String(l.id) } })}
        style={styles.top}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.photo} cachePolicy="disk" alt="" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <ImageOff color={colors.inkMuted} size={20} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {l.title}
          </Text>
          <Text style={styles.price}>
            {amount}
            <Text style={styles.muted}> {suffix}</Text>
          </Text>
          <Text style={styles.muted} numberOfLines={1}>
            {placeLabel(l)}
          </Text>
          <Text style={[styles.status, styles[statusTone]]}>{statusLine}</Text>
        </View>
      </Pressable>

      {actions.confirm && (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Still available?</Text>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={() => run(() => onUpdate(confirmNow()))}>
            <Text style={styles.link}>Yes</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={() => run(() => onUpdate({ status: taken }))}>
            <Text style={styles.mutedLink}>No, it&apos;s {taken}</Text>
          </Pressable>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        {actions.edit && <Small label="Edit" onPress={() => router.push({ pathname: "/list/[id]/edit", params: { id: String(l.id) } })} />}
        {actions.times && <Small label="Viewing times" disabled={!online} onPress={() => router.push({ pathname: "/list/[id]/times", params: { id: String(l.id) } })} />}
        {actions.markTaken && <Small label={taken === "sold" ? "Mark as sold" : "Mark as let"} disabled={disabled} onPress={() => run(() => onUpdate({ status: taken }))} />}
        {actions.relist && <Small label="Relist" disabled={disabled} onPress={() => run(() => onUpdate({ status: "active", ...confirmNow() }))} />}
        {actions.remove && (
          <Small
            label="Delete"
            danger
            disabled={disabled}
            onPress={() =>
              Alert.alert("Delete this listing?", "This can't be undone.", [
                { text: "Keep it", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => run(onDelete) },
              ])
            }
          />
        )}
      </View>
    </View>
  );
}

function Small({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.small, disabled && styles.dim]}>
      <Text style={[styles.smallText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  top: { flexDirection: "row", gap: 12 },
  photo: { width: 96, height: 76, borderRadius: radius.control, backgroundColor: colors.line },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  price: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  status: { fontFamily: fonts.sansSemi, fontSize: 12 },
  palm: { color: colors.palm },
  gold: { color: colors.goldInk },
  clay: { color: colors.clay },
  confirm: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.control, backgroundColor: colors.goldSoft },
  confirmText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  link: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.palm },
  mutedLink: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.inkMuted },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  small: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.control, borderWidth: 1, borderColor: colors.line },
  smallText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  dangerText: { color: colors.clay },
  dim: { opacity: 0.5 },
});
