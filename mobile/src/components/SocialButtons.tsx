import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { friendlyError } from "@shared/errors.js";
import { signInWithApple, signInWithGoogle, useSocialProviders } from "@/lib/oauth";
import type { Role } from "@/lib/oauthRules";
import { colors, fonts, radius } from "@/theme";

// "Continue with Google" and (on iPhone) "Sign in with Apple". Shown only for
// providers switched on in Supabase. Cancelling shows nothing.
export default function SocialButtons({ role }: { role?: Role }) {
  const providers = useSocialProviders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!providers.google && !providers.apple) return null;

  async function run(signIn: (role?: Role) => Promise<{ ok: true } | { error: string } | { cancelled: true }>) {
    setBusy(true);
    setError("");
    const result = await signIn(role);
    setBusy(false);
    if ("error" in result) setError(friendlyError(result));
    else if ("ok" in result) router.dismissAll();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
      {providers.google && (
        <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={busy} onPress={() => run(signInWithGoogle)} style={[styles.google, busy && styles.dim]}>
          <Text style={styles.g}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>
      )}
      {providers.apple && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.control}
          style={styles.apple}
          onPress={() => run(signInWithApple)}
        />
      )}
      {busy ? <ActivityIndicator color={colors.palm} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  or: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  google: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 50,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  g: { fontFamily: fonts.sansBold, fontSize: 18, color: "#4285F4" },
  googleText: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  apple: { height: 50, width: "100%" },
  dim: { opacity: 0.5 },
  error: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
