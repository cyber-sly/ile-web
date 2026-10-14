import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";

function dayParts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    weekday: date.toLocaleDateString("en-NG", { weekday: "short" }),
    day: date.getDate(),
    month: date.toLocaleDateString("en-NG", { month: "short" }),
  };
}

// Row of day chips ("Mon 12 Oct") and a grid of time chips, for open viewing
// times and for requesting a time.
export default function DayTimePicker({
  days,
  day,
  onDay,
  times,
  time,
  onTime,
  timeLabel,
}: {
  days: string[];
  day: string | null;
  onDay: (day: string) => void;
  times: string[];
  time: string | null;
  onTime: (time: string) => void;
  timeLabel: (time: string) => string;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days} accessibilityRole="radiogroup" accessibilityLabel="Day">
        {days.map((d) => {
          const p = dayParts(d);
          const on = d === day;
          return (
            <Tap
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${p.weekday} ${p.day} ${p.month}`}
              onPress={() => onDay(d)}
              style={[styles.day, on && styles.dayOn]}
            >
              <Text style={[styles.weekday, on && styles.textOnMuted]}>{p.weekday}</Text>
              <Text style={[styles.dayNum, on && styles.textOn]}>{p.day}</Text>
              <Text style={[styles.month, on && styles.textOnMuted]}>{p.month}</Text>
            </Tap>
          );
        })}
      </ScrollView>
      <View style={styles.times} accessibilityRole="radiogroup" accessibilityLabel="Time">
        {times.map((t) => {
          const on = t === time;
          return (
            <Tap
              key={t || "any"}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onTime(t)}
              style={[styles.time, on && styles.timeOn]}
            >
              <Text style={[styles.timeText, on && styles.timeTextOn]}>{timeLabel(t)}</Text>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  days: { gap: 8, paddingVertical: 2 },
  day: {
    width: 58,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  dayOn: { backgroundColor: colors.palm, borderColor: colors.palm },
  weekday: { fontFamily: fonts.sansSemi, fontSize: 12, textTransform: "uppercase", color: colors.inkMuted },
  dayNum: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink },
  month: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  textOn: { color: colors.white },
  textOnMuted: { color: "rgba(255,255,255,0.8)" },
  times: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  time: {
    width: "31%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  timeOn: { borderColor: colors.palm, backgroundColor: colors.palmSoft },
  timeText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  timeTextOn: { color: colors.palm },
});
