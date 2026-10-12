import { useState } from "react";
import { friendlyError, OFFLINE_MESSAGE } from "@shared/errors.js";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Mail, MailCheck } from "lucide-react-native";
import AuthScreen, { FormError, LOGIN_PHOTO } from "@/components/AuthScreen";
import { Button, Field } from "@/components/kit";
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
    // Never reveal whether an email is registered; only report rate limits
    // and a missing connection (otherwise we'd say "sent" when nothing was).
    if (resetError && resetError.status === 429) {
      setError("Too many reset emails requested. Please wait a few minutes.");
      return;
    }
    if (resetError && friendlyError(resetError) === OFFLINE_MESSAGE) {
      setError(OFFLINE_MESSAGE);
      return;
    }
    setSent(true);
  }

  const footer = (
    <Text style={styles.footer}>
      Remembered it?{" "}
      <Link href="/login" style={styles.link}>
        Log in
      </Link>
    </Text>
  );

  if (sent) {
    return (
      <AuthScreen image={LOGIN_PHOTO} title="Check your email">
        <View style={styles.notice}>
          <MailCheck color={colors.palm} size={30} />
          <Text style={styles.body}>
            If an account exists for <Text style={styles.strong}>{email.trim()}</Text>, we&apos;ve sent a link to reset your password. It may take
            a minute to arrive, so check your spam folder too.
          </Text>
          <Text style={styles.muted}>The link works once and expires after an hour.</Text>
          <Button label="Use a different email" variant="neutral" onPress={() => setSent(false)} />
        </View>
        {footer}
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      image={LOGIN_PHOTO}
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we'll send you a link to set a new one."
    >
      <Field
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      {error ? <FormError>{error}</FormError> : null}
      <Button label={busy ? "Sending…" : "Send reset link"} loading={busy} onPress={send} disabled={!email} />
      {footer}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  notice: { gap: 12, padding: 20, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  body: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, lineHeight: 22 },
  strong: { fontFamily: fonts.sansSemi },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  link: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.palm },
  footer: { fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted, textAlign: "center" },
});
