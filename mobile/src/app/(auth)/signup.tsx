import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Search, Building2, MailCheck } from "lucide-react-native";
import Screen from "@/components/Screen";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { setRememberMe } from "@/lib/secureStore";
import { colors, fonts, radius } from "@/theme";

const ROLES = [
  { value: "tenant", Icon: Search, title: "Find a place", body: "Rent or buy a home" },
  { value: "landlord", Icon: Building2, title: "List property", body: "Owner, agent or caretaker" },
] as const;

const MIN_PASSWORD = 8;

export default function SignupScreen() {
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function signUp() {
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    await setRememberMe(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), role } },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setCheckEmail(true); // email confirmation is switched on
      return;
    }
    router.dismissAll();
  }

  if (checkEmail) {
    return (
      <Screen title="Check your email">
        <View style={styles.notice}>
          <MailCheck color={colors.palm} size={30} />
          <Text style={styles.body}>
            We sent a confirmation link to {email.trim()}. Open it to activate your account, then log in.
          </Text>
        </View>
        <Button label="Go to log in" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  return (
    <Screen title="Create your account" subtitle="Free for everyone. No search or inspection fees.">
      <Text style={styles.legend}>I want to</Text>
      <View style={styles.roles}>
        {ROLES.map(({ value, Icon, title, body }) => {
          const on = role === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setRole(value)}
              style={[styles.role, on && styles.roleOn]}
            >
              <Icon color={on ? colors.palm : colors.inkMuted} size={22} />
              <Text style={styles.roleTitle}>{title}</Text>
              <Text style={styles.roleBody}>{body}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
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
        autoComplete="new-password"
        textContentType="newPassword"
        hint={`At least ${MIN_PASSWORD} characters.`}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create account" loading={busy} onPress={signUp} disabled={!fullName || !email || !password} />
      <Text style={styles.terms}>By creating an account you agree to our Terms of Service and Privacy Policy.</Text>
      <Link href="/login" style={styles.link}>
        Already have an account? Log in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  legend: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink, marginBottom: -8 },
  roles: { flexDirection: "row", gap: 12 },
  role: {
    flex: 1,
    gap: 4,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  roleOn: { borderColor: colors.palm, backgroundColor: colors.palmSoft },
  roleTitle: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink, marginTop: 4 },
  roleBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  notice: { gap: 12, padding: 18, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  body: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, lineHeight: 22 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
  terms: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, textAlign: "center" },
  link: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm, textAlign: "center" },
});
