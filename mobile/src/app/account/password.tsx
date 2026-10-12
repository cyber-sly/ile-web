import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { MIN_PASSWORD } from "@shared/account.js";
import { friendlyError } from "@shared/errors.js";
import { supabase } from "@/lib/supabase";
import Screen from "@/components/Screen";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { colors, fonts } from "@/theme";

// Change the password for an email account.
export default function ChangePasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function save() {
    setError("");
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(friendlyError(updateError));
    setDone(true);
  }

  if (done) {
    return (
      <Screen title="Password changed" subtitle="Use your new password next time you log in.">
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="Change password">
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint={`At least ${MIN_PASSWORD} characters.`}
      />
      <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Save new password" loading={busy} disabled={!password || !confirm} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
