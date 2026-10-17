import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Tap from "@/components/kit/Tap";
import type { TakenRange } from "@/lib/stays";
import { colors, fonts, radius } from "@/theme";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isTaken = (date: string, taken: TakenRange[]) => taken.some((t) => t.check_in <= date && date < t.check_out);

// Month calendar for choosing check-in then check-out (no native picker
// needed). Past and booked nights can't start a stay; check-out may land on
// a booked day (the next guest's check-in), but not cross a booked night.
export default function MonthGrid({
  checkIn,
  checkOut,
  taken,
  today,
  onChange,
}: {
  checkIn: string;
  checkOut: string;
  taken: TakenRange[];
  today: string;
  onChange: (dates: { checkIn: string; checkOut: string }) => void;
}) {
  const start = checkIn || today;
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const thisMonth = view.y === Number(today.slice(0, 4)) && view.m === Number(today.slice(5, 7)) - 1;
  const crossesBooked = (from: string, to: string) => taken.some((t) => t.check_in < to && from < t.check_out);

  function move(delta: number) {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  }

  function pick(date: string) {
    if (!checkIn || checkOut || date <= checkIn) {
      if (date >= today && !isTaken(date, taken)) onChange({ checkIn: date, checkOut: "" });
    } else if (!crossesBooked(checkIn, date)) {
      onChange({ checkIn, checkOut: date });
    } else if (!isTaken(date, taken)) {
      onChange({ checkIn: date, checkOut: "" });
    }
  }

  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Tap accessibilityRole="button" accessibilityLabel="Previous month" disabled={thisMonth} hitSlop={8} onPress={() => move(-1)} style={thisMonth && styles.dim}>
          <ChevronLeft color={colors.ink} size={20} />
        </Tap>
        <Text style={styles.month}>
          {MONTHS[view.m]} {view.y}
        </Text>
        <Tap accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} onPress={() => move(1)}>
          <ChevronRight color={colors.ink} size={20} />
        </Tap>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) return <View key={`x${i}`} style={styles.cell} />;
          const booked = isTaken(date, taken);
          const canEnd = Boolean(checkIn && !checkOut && date > checkIn && !crossesBooked(checkIn, date));
          const disabled = date < today || (booked && !canEnd);
          const edge = date === checkIn || date === checkOut;
          const inRange = Boolean(checkIn && checkOut && date > checkIn && date < checkOut);
          return (
            <Tap
              key={date}
              accessibilityRole="button"
              accessibilityLabel={booked ? `${date}, booked` : date}
              accessibilityState={{ selected: edge, disabled }}
              disabled={disabled}
              onPress={() => pick(date)}
              style={[styles.cell, inRange && styles.range, edge && styles.edge]}
            >
              <Text style={[styles.day, disabled && styles.off, booked && styles.booked, inRange && styles.rangeText, edge && styles.edgeText]}>
                {Number(date.slice(8))}
              </Text>
            </Tap>
          );
        })}
      </View>
      <Text style={styles.hint}>{!checkIn ? "Choose your check-in date." : !checkOut ? "Now choose your check-out date." : "Tap a date to start again."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, borderRadius: radius.control, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, gap: 6 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  month: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  dim: { opacity: 0.3 },
  week: { flexDirection: "row" },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontFamily: fonts.sansSemi, fontSize: 12, color: colors.inkMuted },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.control },
  range: { backgroundColor: colors.palmSoft },
  edge: { backgroundColor: colors.palm },
  day: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  off: { color: colors.inkMuted, opacity: 0.4 },
  booked: { textDecorationLine: "line-through" },
  rangeText: { color: colors.palm },
  edgeText: { color: colors.white, fontFamily: fonts.sansBold },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
});
