import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { friendlyError } from "@shared/errors.js";
import { signInWithApple, signInWithGoogle, useSocialProviders } from "@/lib/oauth";
import type { Role } from "@/lib/oauthRules";
import { colors, fonts, radius } from "@/theme";

// "Continue with Google" and (on iPhone) "Sign in with Apple". Shown only for
// providers switched on in Supabase. Cancelling shows nothing. On top (as on
// the website), the "or" divider comes after the buttons.
export default function SocialButtons({
  role,
  remember = true,
  placement = "bottom",
  googleLabel = "Continue with Google",
  next,
  inviteCode,
}: {
  role?: Role;
  remember?: boolean;
  placement?: "top" | "bottom";
  googleLabel?: string;
  next?: "/list/new" | null;
  inviteCode?: string | null;
}) {
  const providers = useSocialProviders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!providers.google && !providers.apple) return null;

  async function run(
    signIn: (role?: Role, remember?: boolean, inviteCode?: string | null) => Promise<{ ok: true } | { error: string } | { cancelled: true }>
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn(role, remember, inviteCode);
      if ("error" in result) setError(friendlyError(result.error));
      else if ("ok" in result) {
        if (router.canDismiss()) router.dismissAll();
        if (next) router.push(next);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const divider = (
    <View style={styles.dividerRow}>
      <View style={styles.line} />
      <Text style={[styles.or, placement === "top" && styles.orTop]}>{placement === "top" ? "or with email" : "or"}</Text>
      <View style={styles.line} />
    </View>
  );

  return (
    <View style={styles.wrap}>
      {placement === "bottom" && divider}
      {providers.google && (
        <Pressable accessibilityRole="button" accessibilityLabel={googleLabel} disabled={busy} onPress={() => run(signInWithGoogle)} style={[styles.google, busy && styles.dim]}>
          <Text style={styles.g}>G</Text>
          <Text style={styles.googleText}>{googleLabel}</Text>
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
      {placement === "top" && divider}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.lineStrong },
  or: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  orTop: { fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" },
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
