import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants, { ExecutionEnvironment } from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { notificationRoute } from "@shared/notifications.js";
import { supabase } from "./supabase";
import { forgetPendingToken, logOutDevice, saveToken } from "./pushTokens";

export const TOKEN_KEY = "ile:push-token";
export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Push needs a real phone, and on Android a development or store build
// (Expo Go can't receive push there since SDK 53).
export function pushSupported(): boolean {
  if (!Device.isDevice) return false;
  return !(Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);
}

export async function getPermission(): Promise<PushPermission> {
  if (!pushSupported()) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

// Get this phone's Expo token and attach it to the logged-in account.
async function registerDevice() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Ile",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#1F7A2C",
    });
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await saveToken(supabase, token, Platform.OS === "ios" ? "ios" : "android");
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

// Called when the person taps "Turn on notifications".
export async function enablePush(): Promise<PushPermission> {
  if (!pushSupported()) return "unsupported";
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return "denied";
  await registerDevice();
  return "granted";
}

const tokenStorage = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

// On login (or app start while logged in): keep this phone's token current.
// With nobody logged in (logout, expired session): make sure this phone no
// longer gets the previous account's notifications.
export async function syncPush(userId: string | null) {
  try {
    if (!userId) {
      await forgetPendingToken(supabase, tokenStorage);
      return;
    }
    if ((await getPermission()) === "granted") await registerDevice();
  } catch {
    // Offline: the next app start tries again.
  }
}

// Log out on this phone (stops its notifications for this account first).
export function logOutThisDevice() {
  return logOutDevice(supabase, tokenStorage, () => supabase.auth.signOut({ scope: "local" }));
}

// Open the right screen when a notification is tapped (also when it opened the app).
export function usePushTaps() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = response.notification.request.content.data as Record<string, unknown>;
    if (typeof data?.notificationId === "string") {
      supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", data.notificationId).then(() => {}, () => {});
    }
    router.push(notificationRoute(data) as never);
  }, [response]);
}

// Current permission, refreshed when the person comes back from Settings.
export function usePushPermission(): [PushPermission | null, (p: PushPermission) => void] {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  useEffect(() => {
    let alive = true;
    const check = () => getPermission().then((p) => alive && setPermission(p), () => {});
    check();
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return [permission, setPermission];
}
