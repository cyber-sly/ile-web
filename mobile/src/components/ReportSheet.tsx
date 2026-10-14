import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldAlert, X } from "lucide-react-native";
import { reportListing } from "@shared/account.js";
import { REPORT_REASONS } from "@shared/property.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import Chip from "@/components/Chip";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { colors, fonts } from "@/theme";
import Tap from "@/components/kit/Tap";
import { successHaptic } from "@/lib/haptics";

// Report a listing to Ile's team.
export default function ReportSheet({ visible, listingId, userId, onClose }: { visible: boolean; listingId: string; userId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await reportListing(supabase, { listingId, userId, reason, details });
      successHaptic();
      setSent(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Report this listing</Text>
          <Tap accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
            <X color={colors.ink} size={24} />
          </Tap>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sent ? (
            <View style={styles.done}>
              <ShieldAlert color={colors.palm} size={28} />
              <Text style={styles.doneText}>Thanks. We&apos;ll look into it.</Text>
              <Button label="Close" variant="secondary" onPress={onClose} />
            </View>
          ) : (
            <>
              <Text style={styles.muted}>What&apos;s wrong with it? The lister won&apos;t see who reported it.</Text>
              <View style={styles.reasons}>
                {(REPORT_REASONS as { value: string; label: string }[]).map((r) => (
                  <Chip key={r.value} label={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
                ))}
              </View>
              <Field label="More details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Send report" loading={busy} disabled={!reason} onPress={submit} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  reasons: { gap: 8, alignItems: "flex-start" },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  done: { alignItems: "center", gap: 12, paddingVertical: 32 },
  doneText: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
});
