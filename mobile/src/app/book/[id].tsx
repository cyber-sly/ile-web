import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ShieldCheck, Zap } from "lucide-react-native";
import { bookSlot, fetchActiveViewing, fetchOpenSlots, groupSlotsByDay, requestViewing } from "@shared/viewings.js";
import { formatDateTime, formatTime } from "@shared/format.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { REQUEST_TIMES, requestDays, todayInLagos } from "@/lib/requestTimes";
import DayTimePicker from "@/components/DayTimePicker";
import Button from "@/components/Button";
import StatusBadge from "@/components/StatusBadge";
import { colors, fonts, radius } from "@/theme";

type Viewing = { id: string; status: string; preferred_date: string; preferred_time: string | null; proposed_date?: string; proposed_time?: string };
type Slot = { slot_date: string; slot_time: string };

const STATUS_LINE: Record<string, string> = {
  pending: "Request sent. The lister will confirm or suggest another time.",
  countered: "Accept or decline the new time in My viewings.",
  confirmed: "You're booked in. See you there.",
};

// Booking sheet: an open time (confirmed instantly) or a requested time.
export default function BookSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const [requestMode, setRequestMode] = useState(false);

  const existing = useQuery({
    queryKey: ["active-viewing", id, userId],
    queryFn: () => fetchActiveViewing(supabase, id, userId) as Promise<Viewing | null>,
    enabled: Boolean(userId),
  });
  const slots = useQuery({ queryKey: ["open-slots", id], queryFn: () => fetchOpenSlots(supabase, id) as Promise<Slot[]> });

  function booked(viewing: Viewing) {
    queryClient.setQueryData(["active-viewing", id, userId], viewing);
    queryClient.invalidateQueries({ queryKey: ["viewings"] });
  }

  let body;
  if (existing.isPending || slots.isPending) {
    body = <ActivityIndicator color={colors.palm} style={styles.loading} />;
  } else if (existing.data) {
    const v = existing.data;
    body = (
      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.heading}>Your viewing</Text>
          <StatusBadge status={v.status} />
        </View>
        <View style={styles.row}>
          <CalendarDays color={colors.palm} size={18} />
          <Text style={styles.body}>
            {v.status === "countered"
              ? `Lister suggested ${formatDateTime(v.proposed_date, v.proposed_time)}`
              : formatDateTime(v.preferred_date, v.preferred_time)}
          </Text>
        </View>
        <Text style={styles.muted}>{STATUS_LINE[v.status]}</Text>
        <Button
          label="Go to My viewings"
          variant="secondary"
          onPress={() => {
            router.back();
            router.navigate("/viewings");
          }}
        />
      </View>
    );
  } else if ((slots.data || []).length > 0 && !requestMode) {
    body = (
      <>
        <SlotBooking listingId={id} slots={slots.data || []} onBooked={booked} onTaken={() => slots.refetch()} />
        <Pressable accessibilityRole="button" onPress={() => setRequestMode(true)} style={styles.switch}>
          <Text style={styles.link}>None of these work? Request another time</Text>
        </Pressable>
      </>
    );
  } else {
    body = (
      <>
        <RequestBooking listingId={id} userId={userId} onBooked={booked} />
        {(slots.data || []).length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => setRequestMode(false)} style={styles.switch}>
            <Text style={styles.link}>Back to open times</Text>
          </Pressable>
        )}
      </>
    );
  }

  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
      {body}
      <View style={styles.notice}>
        <ShieldCheck color={colors.palm} size={18} />
        <Text style={styles.muted}>Viewings on Ile are free. Never pay an inspection fee to see a property.</Text>
      </View>
    </ScrollView>
  );
}

function SlotBooking({
  listingId,
  slots,
  onBooked,
  onTaken,
}: {
  listingId: string;
  slots: Slot[];
  onBooked: (v: Viewing) => void;
  onTaken: () => void;
}) {
  const days: { date: string; times: string[] }[] = useMemo(() => groupSlotsByDay(slots), [slots]);
  const [day, setDay] = useState<string | null>(days[0]?.date ?? null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const times = days.find((d) => d.date === day)?.times || [];

  async function book() {
    if (!day || !time) return;
    setBusy(true);
    setError("");
    try {
      const viewingId = await bookSlot(supabase, listingId, day, time);
      onBooked({ id: viewingId, status: "confirmed", preferred_date: day, preferred_time: time });
    } catch (e) {
      setError((e as Error).message);
      setTime(null);
      onTaken(); // someone may have just taken it: reload the open times
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Pick a viewing time</Text>
      <View style={styles.row}>
        <Zap color={colors.gold} size={15} />
        <Text style={styles.muted}>Confirmed instantly. Free.</Text>
      </View>
      <DayTimePicker
        days={days.map((d) => d.date)}
        day={day}
        onDay={(d) => {
          setDay(d);
          setTime(null);
        }}
        times={times}
        time={time}
        onTime={setTime}
        timeLabel={formatTime}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={time && day ? `Book ${formatDateTime(day, time)}` : "Choose a time"} loading={busy} disabled={!time} onPress={book} />
    </View>
  );
}

function RequestBooking({ listingId, userId, onBooked }: { listingId: string; userId: string; onBooked: (v: Viewing) => void }) {
  const days = useMemo(() => requestDays(todayInLagos()), []);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request() {
    if (!day) return;
    setBusy(true);
    setError("");
    try {
      onBooked(await requestViewing(supabase, listingId, userId, day, time || null));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Request a viewing</Text>
      <Text style={styles.muted}>The lister will confirm or suggest another time.</Text>
      <DayTimePicker
        days={days}
        day={day}
        onDay={setDay}
        times={REQUEST_TIMES}
        time={time}
        onTime={setTime}
        timeLabel={(t) => (t ? formatTime(t) : "Any time")}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Request viewing" loading={busy} disabled={!day} onPress={request} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  loading: { marginVertical: 40 },
  section: { gap: 12 },
  heading: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  body: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  muted: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  switch: { alignItems: "center", paddingVertical: 6 },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  notice: { flexDirection: "row", gap: 8, padding: 14, borderRadius: radius.control, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
});
