import { useState } from "react";
import { friendlyError } from "@shared/errors.js";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import SocialButtons from "@/components/SocialButtons";
import AuthScreen, { FooterLink, FormError, LOGIN_PHOTO } from "@/components/AuthScreen";
import { Button, Em, Field } from "@/components/kit";
import { supabase } from "@/lib/supabase";
import { setRememberMe } from "@/lib/secureStore";
import { colors, fonts } from "@/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function logIn() {
    setError("");
    setBusy(true);
    await setRememberMe(remember); // decides where the session is stored, so before sign-in
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (loginError) {
      setError(friendlyError(loginError));
      return;
    }
    router.dismissAll();
  }

  return (
    <AuthScreen
      image={LOGIN_PHOTO}
      quote={
        <>
          Your next place is <Em>already listed.</Em>
        </>
      }
      title="Welcome back"
      subtitle="Log in to make bookings and manage your listings."
    >
      <SocialButtons remember={remember} placement="top" />
      <Field
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        icon={Lock}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <View style={styles.row}>
        <View style={styles.remember}>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ true: colors.palm, false: colors.lineStrong }}
            accessibilityLabel="Keep me logged in"
          />
          <Text style={styles.small}>Keep me logged in</Text>
        </View>
        <Link href="/forgot-password" style={styles.link}>
          Forgot password?
        </Link>
      </View>
      {!remember && <Text style={styles.hint}>You&apos;ll be logged out when you close the app. Best for shared phones.</Text>}
      {error ? <FormError>{error}</FormError> : null}
      <Button label={busy ? "Logging in…" : "Log in"} loading={busy} onPress={logIn} disabled={!email || !password} />
      <FooterLink prompt="New to Ile?" label="Create a free account" href="/signup" />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: -6 },
  remember: { flexDirection: "row", alignItems: "center", gap: 8 },
  small: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: -8 },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
});
