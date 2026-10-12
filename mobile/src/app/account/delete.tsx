import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { hasPassword, verifyPassword } from "@shared/account.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { deleteAccountHere } from "@/lib/accountDevice";
import { useOnline } from "@/components/OfflineBanner";
import Screen from "@/components/Screen";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { colors, fonts, radius } from "@/theme";

const DELETED = [
  "your profile and login",
  "all your listings, with their photos and videos",
  "viewings on your listings and viewings you booked",
  "reviews other people wrote about you",
];
const KEPT = [
  "your messages, so the people you chatted with keep their history (you'll show as “Deleted user”)",
  "reviews you wrote, which were already anonymous",
];

// Permanently delete the account (required by the App Store and Google Play).
export default function DeleteAccountScreen() {
  const { user } = useSession();
  const online = useOnline();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user) return <Screen title="Log in to delete your account" />;
  const usesPassword = hasPassword(user);
  const ready = usesPassword ? confirm.length > 0 : confirm.trim().toUpperCase() === "DELETE";

  async function remove() {
    setBusy(true);
    setError("");
    try {
      if (usesPassword && !(await verifyPassword(supabase, user!.email!, confirm))) {
        setError("That password isn't right.");
        return;
      }
      await deleteAccountHere(user!.id);
      router.replace("/");
      Alert.alert("Your account was deleted", "Thank you for using Ile.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Delete account">
      <View style={styles.box}>
        <Text style={styles.strong}>This can&apos;t be undone.</Text>
        <Text style={styles.strong}>Deleted:</Text>
        {DELETED.map((d) => (
          <Text key={d} style={styles.item}>
            • {d}
          </Text>
        ))}
        <Text style={styles.strong}>Kept, without your name:</Text>
        {KEPT.map((k) => (
          <Text key={k} style={styles.item}>
            • {k}
          </Text>
        ))}
      </View>
      {usesPassword ? (
        <Field label="Enter your password to confirm" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="current-password" />
      ) : (
        <Field label={'Type "DELETE" to confirm'} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!online ? <Text style={styles.muted}>Deleting your account needs a connection.</Text> : null}
      <Button label="Delete my account" variant="danger" loading={busy} disabled={!ready || !online} onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6, padding: 16, borderRadius: radius.control, backgroundColor: colors.claySoft },
  strong: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink, marginTop: 4 },
  item: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
});
