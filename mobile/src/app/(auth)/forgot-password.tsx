import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MailCheck } from "lucide-react-native";
import Screen from "@/components/Screen";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { colors, fonts, radius } from "@/theme";

// The reset link opens the website's reset page (opening the app from links
// needs the custom domain).
const RESET_URL = `${process.env.EXPO_PUBLIC_SITE_URL}/reset-password`;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_URL });
    setBusy(false);
    // Never reveal whether an email is registered; only report rate limits.
    if (resetError && resetError.status === 429) {
      setError("Too many reset emails requested. Please wait a few minutes.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Screen title="Check your email">
        <View style={styles.notice}>
          <MailCheck color={colors.palm} size={30} />
          <Text style={styles.body}>
            If an account exists for {email.trim()}, we have sent a link to reset your password. It may take a minute, so check
            spam too.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Forgot your password?" subtitle="Enter the email you signed up with and we will send you a link to set a new one.">
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Send reset link" loading={busy} onPress={send} disabled={!email} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { gap: 12, padding: 18, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  body: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, lineHeight: 22 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
