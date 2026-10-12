import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import { logOutThisDevice } from "@/lib/push";
import { isLister, useSession } from "@/lib/useSession";
import { colors, fonts, radius } from "@/theme";

export default function AccountScreen() {
  const { user, loading } = useSession();
  const [busy, setBusy] = useState(false);

  if (loading) return <Screen title="Account" />;

  if (!user) {
    return (
      <Screen title="Account" subtitle="Log in to book viewings, message listers and save homes.">
        <Button label="Log in" onPress={() => router.push("/login")} />
        <Button label="Create a free account" variant="secondary" onPress={() => router.push("/signup")} />
      </Screen>
    );
  }

  const name = user.user_metadata?.full_name || "Your account";

  async function logOut() {
    setBusy(true);
    await logOutThisDevice(); // this device only, like the website; stops its notifications first
    setBusy(false);
  }

  return (
    <Screen title="Account">
      <View style={styles.card}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.role}>{isLister(user) ? "Lister account" : "Home-seeker account"}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/notifications")} style={styles.row}>
        <Bell color={colors.palm} size={20} />
        <Text style={styles.rowText}>Notifications</Text>
        <ChevronRight color={colors.inkMuted} size={18} />
      </Pressable>
      <Button label="Log out" variant="danger" loading={busy} onPress={logOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.palmDark, borderRadius: radius.hero, padding: 20 },
  name: { fontFamily: fonts.serif, fontSize: 24, color: colors.white },
  email: { fontFamily: fonts.sans, fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  role: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.gold, marginTop: 10, textTransform: "uppercase", letterSpacing: 1 },
});
