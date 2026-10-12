import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Bell, BellOff } from "lucide-react-native";
import { friendlyError } from "@shared/errors.js";
import { enablePush, usePushPermission } from "@/lib/push";
import Button from "@/components/Button";
import { colors, fonts, radius } from "@/theme";

// Asks for notification permission only when the person chooses to.
export default function NotificationsCard() {
  const [permission, setPermission] = usePushPermission();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (permission === null || permission === "granted" || permission === "unsupported") return null;

  if (permission === "denied") {
    return (
      <View style={styles.card}>
        <BellOff color={colors.inkMuted} size={20} />
        <View style={styles.text}>
          <Text style={styles.body}>Notifications are off. Turn them on in your phone&apos;s Settings.</Text>
          <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()}>
            <Text style={styles.link}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function turnOn() {
    setBusy(true);
    setError("");
    try {
      setPermission(await enablePush());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Bell color={colors.palm} size={20} />
      <View style={styles.text}>
        <Text style={styles.title}>Get notified about messages and viewings</Text>
        <Text style={styles.body}>Know straight away when someone replies or confirms a time.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Turn on notifications" loading={busy} onPress={turnOn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: colors.palmSoft, marginBottom: 12 },
  text: { flex: 1, gap: 6 },
  title: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
});
