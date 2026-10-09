import { useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import { WifiOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline()
  );
}

// Thin bar at the top of every screen while the phone has no connection.
export default function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]} accessibilityRole="alert">
      <WifiOff color={colors.goldInk} size={16} />
      <Text style={styles.text}>You&apos;re offline. Saved and recently viewed homes still work.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.goldSoft },
  text: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.goldInk },
});
