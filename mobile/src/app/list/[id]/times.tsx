import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { availabilityRows, DEFAULT_WINDOW, fetchAvailability, saveAvailability, SLOT_LENGTHS, WEEKDAYS } from "@shared/lister.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import Chip from "@/components/Chip";
import TimeStepper from "@/components/TimeStepper";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";

type Day = { on: boolean; start: string; end: string };
const hhmm = (t: string | null) => (t || "").slice(0, 5);

// Weekly viewing times for one listing. Bookings in these slots are confirmed instantly.
export default function ViewingTimesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const online = useOnline();
  const data = useQuery({ queryKey: ["availability", id], queryFn: () => fetchAvailability(supabase, id), staleTime: 0 });

  if (data.isPending && !online) return <Screen title="Viewing times need a connection" subtitle="Connect to the internet to see and change them." />;
  if (data.isPending) return <ActivityIndicator color={colors.palm} style={styles.loading} />;
  if (data.isError && !data.data) {
    return (
      <Screen title="Couldn't load viewing times" subtitle="Check your connection and try again.">
        <Button label="Try again" onPress={() => data.refetch()} />
      </Screen>
    );
  }

  const listing = data.data?.listing;
  if (!listing || !user || listing.landlord_id !== user.id) {
    return (
      <Screen title="You can only set viewing times on your own listings" subtitle="Log in with the account that posted this listing.">
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <TimesEditor id={id} listing={listing} windows={data.data!.windows} online={online} />;
}

type Window = { weekday: number; start_time: string | null; end_time: string | null };

function startingDays(windows: Window[]): Record<number, Day> {
  const next: Record<number, Day> = {};
  for (const w of WEEKDAYS) next[w.value] = { on: false, ...DEFAULT_WINDOW };
  for (const r of windows) next[r.weekday] = { on: true, start: hhmm(r.start_time), end: hhmm(r.end_time) };
  return next;
}

function TimesEditor({ id, listing, windows, online }: { id: string; listing: Record<string, any>; windows: Window[]; online: boolean }) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<Record<number, Day> | null>(() => startingDays(windows));
  const [minutes, setMinutes] = useState<number>(listing.viewing_slot_minutes || 30);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const setDay = (weekday: number, changes: Partial<Day>) => setDays((d) => (d ? { ...d, [weekday]: { ...d[weekday], ...changes } } : d));
  const firstOn = WEEKDAYS.find((w) => days![w.value].on)?.value;

  function copyToAll(weekday: number) {
    const src = days![weekday];
    setDays((d) => (d ? Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.on ? { ...v, start: src.start, end: src.end } : v])) : d));
  }

  async function save() {
    setMessage(null);
    const { rows, error } = availabilityRows(days!);
    if (error) return setMessage({ tone: "error", text: error });
    setSaving(true);
    try {
      const open = await saveAvailability(supabase, id, minutes, rows);
      queryClient.invalidateQueries({ queryKey: ["open-slots", id] });
      setMessage({
        tone: "success",
        text: rows.length
          ? `Saved. ${open} open viewing slots in the next two weeks. Bookings are confirmed instantly and appear in your dashboard.`
          : "Saved. With no viewing times set, people will request a time and you confirm it.",
      });
    } catch (e) {
      setMessage({ tone: "error", text: friendlyError(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.listing} numberOfLines={2}>
        {listing.title}
      </Text>
      <Text style={styles.muted}>Pick the days and times you can show the property. People book a slot and it&apos;s confirmed instantly.</Text>

      {WEEKDAYS.map((w) => {
        const d = days![w.value];
        return (
          <View key={w.value} style={styles.day}>
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>{w.label}</Text>
              <Switch
                accessibilityLabel={`${w.label} viewings`}
                value={d.on}
                onValueChange={(on) => setDay(w.value, { on })}
                trackColor={{ true: colors.palm, false: colors.lineStrong }}
              />
            </View>
            {d.on && (
              <>
                <View style={styles.times}>
                  <TimeStepper label="From" value={d.start} onChange={(start) => setDay(w.value, { start })} />
                  <TimeStepper label="To" value={d.end} onChange={(end) => setDay(w.value, { end })} />
                </View>
                {w.value === firstOn && (
                  <Pressable accessibilityRole="button" onPress={() => copyToAll(w.value)}>
                    <Text style={styles.link}>Copy these times to all chosen days</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        );
      })}

      <Text style={styles.section}>Each viewing lasts</Text>
      <View style={styles.chips}>
        {SLOT_LENGTHS.map((m: number) => (
          <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
        ))}
      </View>

      {message && <Text style={message.tone === "error" ? styles.error : styles.success}>{message.text}</Text>}
      <Button label={online ? "Save viewing times" : "This needs a connection"} loading={saving} disabled={!online} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  loading: { marginTop: 40 },
  listing: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  day: { gap: 10, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayName: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  times: { flexDirection: "row", gap: 16 },
  link: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.palm },
  section: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  success: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.palm },
});
