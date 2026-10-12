import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  Heart,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  Pencil,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react-native";
import { fetchMyProfile, hasPassword } from "@shared/account.js";
import { profileCompleteness } from "@shared/profileDisplay.js";
import { CONTACT_EMAIL } from "@shared/site.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import { isLister, useSession } from "@/lib/useSession";
import { logOutThisDevice } from "@/lib/push";
import { logOutEverywhereHere } from "@/lib/accountDevice";
import { useSavedIds } from "@/lib/saved";
import { useUnreadCount } from "@/lib/unread";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import { colors, fonts, radius } from "@/theme";

const SITE = process.env.EXPO_PUBLIC_SITE_URL;

type RowProps = { Icon: typeof Bell; label: string; detail?: string; onPress: () => void; danger?: boolean };

function Row({ Icon, label, detail, onPress, danger }: RowProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Icon color={danger ? colors.clay : colors.palm} size={20} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <ChevronRight color={colors.inkMuted} size={18} />
    </Pressable>
  );
}

export default function AccountScreen() {
  const { user, loading } = useSession();
  const savedCount = useSavedIds().length;
  const unread = useUnreadCount(user?.id ?? null);
  const [busy, setBusy] = useState(false);
  const profile = useQuery({
    queryKey: ["my-profile", user?.id ?? ""],
    queryFn: () => fetchMyProfile(supabase),
    enabled: Boolean(user),
  });

  if (loading) return <Screen title="Account" />;

  if (!user) {
    return (
      <Screen title="Account" subtitle="Log in to book viewings, message listers and save homes.">
        <Button label="Log in" onPress={() => router.push("/login")} />
        <Button label="Create a free account" variant="secondary" onPress={() => router.push("/signup")} />
        <View style={styles.group}>
          <Row Icon={Shield} label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} />
          <Row Icon={FileText} label="Terms of Service" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms`)} />
        </View>
      </Screen>
    );
  }

  const lister = isLister(user);
  const p = profile.data;
  const name = p?.full_name?.trim() || user.user_metadata?.full_name || "Your account";
  const { percent, missing } = profileCompleteness(p, lister) as { percent: number; missing: string[] };

  async function logOut() {
    setBusy(true);
    await logOutThisDevice(); // this device only, like the website; stops its notifications first
    setBusy(false);
  }

  function logOutAll() {
    Alert.alert("Log out of all devices?", "You'll be logged out on every phone and browser, including this one.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out everywhere",
        style: "destructive",
        onPress: async () => {
          try {
            const { offline } = await logOutEverywhereHere();
            if (offline) Alert.alert("Logged out on this phone", "You're offline, so other devices may stay logged in until you log out there or reconnect.");
          } catch (e) {
            Alert.alert("Couldn't log out", friendlyError(e));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            {p?.avatar_url ? (
              <Image source={{ uri: p.avatar_url }} style={styles.avatar} cachePolicy="disk" alt="" />
            ) : (
              <View style={[styles.avatar, styles.initial]}>
                <Text style={styles.initialText}>{String(name).charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cardText}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
              <Text style={styles.role}>{lister ? "Lister account" : "Home-seeker account"}</Text>
            </View>
          </View>
          {p && percent < 100 ? (
            <Text style={styles.progress}>
              Profile {percent}% complete. Add {missing[0]}.
            </Text>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => router.push("/account/profile")} style={styles.editButton}>
            <Pencil color={colors.white} size={15} />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        </View>

        <View style={styles.tiles}>
          <Pressable style={styles.tile} onPress={() => router.navigate("/saved")}>
            <Heart color={colors.clay} size={18} />
            <Text style={styles.tileValue}>{savedCount}</Text>
            <Text style={styles.tileLabel}>Saved</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => router.navigate("/viewings")}>
            <CalendarDays color={colors.palm} size={18} />
            <Text style={styles.tileValue}>Open</Text>
            <Text style={styles.tileLabel}>{lister ? "Dashboard" : "Viewings"}</Text>
          </Pressable>
          <Pressable style={styles.tile} onPress={() => router.navigate("/inbox")}>
            <MessageCircle color={colors.palm} size={18} />
            <Text style={styles.tileValue}>{unread}</Text>
            <Text style={styles.tileLabel}>Unread</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Profile and settings</Text>
        <View style={styles.group}>
          <Row Icon={UserRound} label="Edit profile" detail="Photo, bio, languages and more" onPress={() => router.push("/account/profile")} />
          {lister && <Row Icon={UserRound} label="View my public profile" onPress={() => router.push({ pathname: "/u/[id]", params: { id: user.id } })} />}
          <Row Icon={Bell} label="Notifications" detail="Messages, viewings and reminders" onPress={() => router.push("/notifications")} />
          {hasPassword(user) && <Row Icon={KeyRound} label="Change password" onPress={() => router.push("/account/password")} />}
        </View>

        <Text style={styles.section}>Sign-in</Text>
        <View style={styles.group}>
          <Row Icon={LogOut} label="Log out" detail="On this phone" onPress={logOut} />
          <Row Icon={MonitorSmartphone} label="Log out of all devices" detail="Every phone and browser" onPress={logOutAll} />
          <Row Icon={Trash2} label="Delete account" danger onPress={() => router.push("/account/delete")} />
        </View>

        <Text style={styles.section}>Help</Text>
        <View style={styles.group}>
          <Row Icon={Mail} label="Contact support" detail={CONTACT_EMAIL} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
          <Row Icon={Shield} label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} />
          <Row Icon={FileText} label="Terms of Service" onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms`)} />
        </View>
        {busy ? <Text style={styles.muted}>Logging out…</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 4 },
  card: { gap: 12, backgroundColor: colors.palmDark, borderRadius: radius.hero, padding: 18 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 22, color: colors.palm },
  cardText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.serif, fontSize: 22, color: colors.white },
  email: { fontFamily: fonts.sans, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  role: { fontFamily: fonts.sansSemi, fontSize: 11, color: colors.gold, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
  progress: { fontFamily: fonts.sans, fontSize: 13, color: "rgba(255,255,255,0.85)" },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  editText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.white },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, gap: 2, padding: 12, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  tileValue: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink },
  tileLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  section: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8 },
  group: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.cream },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  rowDetail: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  danger: { color: colors.clay },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, textAlign: "center" },
});
