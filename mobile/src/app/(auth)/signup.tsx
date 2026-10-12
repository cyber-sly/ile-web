import { useState } from "react";
import { MIN_PASSWORD } from "@shared/account.js";
import { friendlyError } from "@shared/errors.js";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Building2, Lock, Mail, MailCheck, Search, UserRound } from "lucide-react-native";
import SocialButtons from "@/components/SocialButtons";
import AuthScreen, { FormError, SIGNUP_PHOTO } from "@/components/AuthScreen";
import { Button, Em, Field } from "@/components/kit";
import { supabase } from "@/lib/supabase";
import { setRememberMe } from "@/lib/secureStore";
import { colors, fonts, radius } from "@/theme";

const SITE = process.env.EXPO_PUBLIC_SITE_URL;

const ROLES = [
  { value: "tenant", Icon: Search, title: "Find a place", body: "Rent or buy a home" },
  { value: "landlord", Icon: Building2, title: "List property", body: "Owner, agent or caretaker" },
] as const;

export default function SignupScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<"tenant" | "landlord">(params.role === "landlord" ? "landlord" : "tenant");
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
      setError(friendlyError(signUpError));
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
      <AuthScreen image={SIGNUP_PHOTO} title="Check your email">
        <View style={styles.notice}>
          <MailCheck color={colors.palm} size={30} />
          <Text style={styles.body}>
            We sent a confirmation link to <Text style={styles.strong}>{email.trim()}</Text>. Open it to activate your account, then log in.
          </Text>
          <Button label="Go to log in" onPress={() => router.replace("/login")} />
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      image={SIGNUP_PHOTO}
      quote={
        <>
          A home, a shop, a plot. <Em>Without the wahala.</Em>
        </>
      }
      title="Create your account"
      subtitle="Free for everyone. No search or inspection fees."
    >
      <View>
        <Text style={styles.legend}>I want to</Text>
        <View style={styles.roles} accessibilityRole="radiogroup">
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
      </View>
      <SocialButtons role={role} placement="top" />
      <Field label="Full name" icon={UserRound} value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" />
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
        autoComplete="new-password"
        textContentType="newPassword"
        hint={`At least ${MIN_PASSWORD} characters.`}
      />
      {error ? <FormError>{error}</FormError> : null}
      <Button label={busy ? "Creating account…" : "Create account"} loading={busy} onPress={signUp} disabled={!fullName || !email || !password} />
      <Text style={styles.terms}>
        By creating an account you agree to our{" "}
        <Text style={styles.termsLink} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms`)}>
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text style={styles.termsLink} onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)}>
          Privacy Policy
        </Text>
        .
      </Text>
      <Text style={styles.footer}>
        Already have an account?{" "}
        <Link href="/login" style={styles.link}>
          Log in
        </Link>
      </Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  legend: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink, marginBottom: 8 },
  roles: { flexDirection: "row", gap: 12 },
  role: {
    flex: 1,
    gap: 4,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  roleOn: { borderColor: colors.palm, backgroundColor: colors.palmSoft },
  roleTitle: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink, marginTop: 4 },
  roleBody: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  notice: { gap: 12, padding: 20, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  body: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink, lineHeight: 22 },
  strong: { fontFamily: fonts.sansSemi },
  terms: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.inkMuted, textAlign: "center", marginTop: -6 },
  termsLink: { fontFamily: fonts.sansSemi, color: colors.palm },
  link: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.palm },
  footer: { fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted, textAlign: "center" },
});
