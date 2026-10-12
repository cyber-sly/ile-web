import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { DEFAULT_PREFS, fetchPrefs, savePrefs, type NotificationPrefs } from "@/lib/notificationPrefs";
import NotificationsCard from "@/components/NotificationsCard";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";

const ROWS: { key: keyof NotificationPrefs; title: string; body: string }[] = [
  { key: "messages", title: "Messages", body: "When someone sends you a message." },
  { key: "bookings", title: "Viewings and bookings", body: "Requests, confirmations, new times, cancellations and reviews." },
  { key: "reminders", title: "Reminders", body: "The day before a viewing, and when a listing needs confirming." },
  { key: "hide_message_text", title: "Hide message text on lock screen", body: "Show “Sent you a message” instead of what they wrote." },
];

// Which notifications this person gets. Saved straight away.
export default function NotificationSettings() {
  const { user } = useSession();
  const online = useOnline();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const key = ["notification-prefs", userId];
  const prefs = useQuery({ queryKey: key, queryFn: () => fetchPrefs(supabase, userId), enabled: Boolean(userId) });
  const [error, setError] = useState("");

  if (!user) {
    return (
      <Screen title="Notifications" subtitle="Log in to choose which notifications you get.">
        <Button label="Log in" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  async function toggle(field: keyof NotificationPrefs, value: boolean) {
    const before = prefs.data ?? DEFAULT_PREFS;
    const next = { ...before, [field]: value };
    setError("");
    queryClient.setQueryData(key, next);
    try {
      await savePrefs(supabase, userId, next);
    } catch (e) {
      queryClient.setQueryData(key, before);
      setError(friendlyError(e));
    }
  }

  const current = prefs.data ?? DEFAULT_PREFS;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <NotificationsCard />
      {prefs.isPending && online ? <ActivityIndicator color={colors.palm} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.title}>{row.title}</Text>
            <Text style={styles.body}>{row.body}</Text>
          </View>
          <Switch
            accessibilityLabel={row.title}
            value={current[row.key]}
            disabled={!online || prefs.isPending}
            onValueChange={(v) => toggle(row.key, v)}
            trackColor={{ true: colors.palm, false: colors.lineStrong }}
          />
        </View>
      ))}
      {!online ? <Text style={styles.body}>Changing these needs a connection.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
