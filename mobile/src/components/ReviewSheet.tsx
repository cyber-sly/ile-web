import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { leaveReview } from "@shared/account.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import Stars from "@/components/Stars";
import Chip from "@/components/Chip";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { colors, fonts } from "@/theme";
import Tap from "@/components/kit/Tap";
import { successHaptic } from "@/lib/haptics";

// Review the lister after a viewing (home-seekers), or rate the home-seeker (listers).
export default function ReviewSheet({
  visible,
  inspectionId,
  reviewing,
  name,
  onClose,
  onDone,
}: {
  visible: boolean;
  inspectionId: string;
  reviewing: "lister" | "tenant";
  name?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [accurate, setAccurate] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isLister = reviewing === "lister";
  const who = name?.trim().split(/\s+/)[0] || (isLister ? "the lister" : "them");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await leaveReview(supabase, { inspectionId, rating, comment: comment.trim(), accurate: isLister ? accurate : null });
      successHaptic();
      onDone();
      onClose();
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
          <Text style={styles.title}>{isLister ? `Review ${who}` : `Rate ${who}`}</Text>
          <Tap accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
            <X color={colors.ink} size={24} />
          </Tap>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.muted}>
            {isLister ? "How was the viewing? Your name isn't shown with your review." : "How was this home-seeker to deal with? Only other listers see this."}
          </Text>
          <Stars value={rating} onChange={setRating} size={32} />
          {isLister && (
            <View style={styles.group}>
              <Text style={styles.label}>Was the listing accurate?</Text>
              <View style={styles.chips}>
                <Chip label="Yes" selected={accurate === true} onPress={() => setAccurate(true)} />
                <Chip label="No" selected={accurate === false} onPress={() => setAccurate(false)} />
              </View>
            </View>
          )}
          <Field label="Comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={1000} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Send review" loading={busy} disabled={!rating} onPress={submit} />
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
  group: { gap: 8 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", gap: 8 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
