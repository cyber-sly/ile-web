import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";
import { setRememberMe } from "./secureStore";
import { parseAuthRedirect, providersEnabled, roleForNewUser, type Role } from "./oauthRules";

const REDIRECT = "ile://auth-callback";
type Result = { ok: true } | { error: string } | { cancelled: true };

// Which sign-in providers are switched on in Supabase, fetched once.
let providersPromise: Promise<{ google: boolean; apple: boolean }> | null = null;
function loadProviders() {
  providersPromise ??= fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! },
  })
    .then((r) => (r.ok ? r.json() : {}))
    .then(providersEnabled)
    .catch(() => {
      providersPromise = null; // try again next time (offline)
      return { google: false, apple: false };
    });
  return providersPromise;
}

export function useSocialProviders() {
  const [providers, setProviders] = useState({ google: false, apple: false });
  useEffect(() => {
    let alive = true;
    loadProviders().then(async (p) => {
      const appleHere = Platform.OS === "ios" && p.apple && (await AppleAuthentication.isAvailableAsync().catch(() => false));
      if (alive) setProviders({ google: p.google, apple: Boolean(appleHere) });
    });
    return () => {
      alive = false;
    };
  }, []);
  return providers;
}

// First Google/Apple sign-in: record the role picked on the sign-up screen and
// a name, on the auth account and the profile (like the website's /auth/callback).
async function finishNewUser(chosen: Role | undefined, name?: string | null) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const role = roleForNewUser(user.user_metadata, chosen);
  if (!role) return;
  const fullName = (name || user.user_metadata?.full_name || user.user_metadata?.name || "").trim();
  await supabase.auth.updateUser({ data: { role, full_name: fullName } });
  await supabase.from("profiles").update({ role, full_name: fullName }).eq("id", user.id);
  await supabase.auth.refreshSession();
}

// Google, through the phone's browser.
export async function signInWithGoogle(chosen?: Role, remember = true): Promise<Result> {
  await setRememberMe(remember);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error?.message || "Google sign-in isn't available right now." };
  const session = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT);
  if (session.type !== "success") return { cancelled: true };
  const parsed = parseAuthRedirect(session.url);
  if ("cancelled" in parsed || "error" in parsed) return parsed;
  const { error: sessionError } = await supabase.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
  if (sessionError) return { error: sessionError.message };
  await finishNewUser(chosen);
  return { ok: true };
}

// Sign in with Apple (iPhone only). Apple shares the name only the first time.
export async function signInWithApple(chosen?: Role, remember = true): Promise<Result> {
  await setRememberMe(remember);
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) return { error: "Apple didn't return a sign-in token. Please try again." };
    const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: credential.identityToken, nonce: rawNonce });
    if (error) return { error: error.message };
    const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
    await finishNewUser(chosen, name || null);
    return { ok: true };
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return { cancelled: true };
    return { error: (e as Error).message };
  }
}
