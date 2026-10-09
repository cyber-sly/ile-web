import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { formatTime } from "@shared/format.js";
import { colors, fonts, radius } from "@/theme";

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// A time of day changed with − and + (no native picker needed).
export default function TimeStepper({
  label,
  value,
  onChange,
  step = 30,
  min = "06:00",
  max = "21:00",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: string;
  max?: string;
}) {
  const now = toMinutes(value);
  const earlier = now - step >= toMinutes(min);
  const later = now + step <= toMinutes(max);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} earlier`}
          disabled={!earlier}
          onPress={() => earlier && onChange(toTime(now - step))}
          style={[styles.button, !earlier && styles.dim]}
        >
          <Minus color={colors.palm} size={16} />
        </Pressable>
        <Text style={styles.value}>{formatTime(value)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} later`}
          disabled={!later}
          onPress={() => later && onChange(toTime(now + step))}
          style={[styles.button, !later && styles.dim]}
        >
          <Plus color={colors.palm} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 4 },
  label: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.inkMuted },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  button: { width: 34, height: 34, borderRadius: radius.control, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  dim: { opacity: 0.4 },
  value: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
});
