import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Link, router } from "expo-router";
import Screen from "@/components/Screen";
import Field from "@/components/Field";
import Button from "@/components/Button";
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
      setError(loginError.message);
      return;
    }
    router.dismissAll();
  }

  return (
    <Screen title="Welcome back" subtitle="Log in to book viewings and manage your listings.">
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
      <View style={styles.row}>
        <View style={styles.remember}>
          <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.palm, false: colors.lineStrong }} />
          <Text style={styles.small}>Keep me logged in</Text>
        </View>
        <Link href="/forgot-password" style={styles.link}>
          Forgot password?
        </Link>
      </View>
      {!remember && <Text style={styles.hint}>You will be logged out when you close the app. Best for shared phones.</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Log in" loading={busy} onPress={logIn} disabled={!email || !password} />
      <Link href="/signup" style={[styles.link, styles.center]}>
        New to Ile? Create a free account
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  remember: { flexDirection: "row", alignItems: "center", gap: 8 },
  small: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  center: { textAlign: "center", marginTop: 8 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
