import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { MAX_NOTE, validateCounter } from "@shared/lister.js";
import { formatTime } from "@shared/format.js";
import { friendlyError } from "@shared/errors.js";
import { REQUEST_TIMES, requestDays, todayInLagos } from "@/lib/requestTimes";
import DayTimePicker from "@/components/DayTimePicker";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { colors, fonts } from "@/theme";

// "Suggest another time" for a viewing request.
export default function CounterSheet({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (changes: Record<string, string | null>) => Promise<void>;
}) {
  const today = todayInLagos();
  const days = useMemo(() => requestDays(today), [today]);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const problem = validateCounter({ date: day || "", note }, today);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSend({ status: "countered", proposed_date: day, proposed_time: time || null, landlord_note: note.trim() || null });
      setDay(null);
      setTime("");
      setNote("");
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
          <Text style={styles.title}>Suggest another time</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
            <X color={colors.ink} size={24} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.muted}>The home-seeker can accept or decline your suggestion.</Text>
          <DayTimePicker
            days={days}
            day={day}
            onDay={setDay}
            times={REQUEST_TIMES}
            time={time}
            onTime={setTime}
            timeLabel={(t) => (t ? formatTime(t) : "Any time")}
          />
          <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={MAX_NOTE} multiline placeholder="e.g. Please call the gateman when you arrive" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Send suggestion" loading={busy} disabled={!day} onPress={send} />
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
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
