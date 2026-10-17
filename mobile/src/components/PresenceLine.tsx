import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { presenceLabel } from "@shared/presence.js";
import { colors, fonts } from "@/theme";

// "Online" (green) or "Last seen …" under a chat partner's name; nothing when unknown.
export default function PresenceLine({ lastSeenAt }: { lastSeenAt: string | null | undefined }) {
  // Redraw every 30 s so "Online" turns into "Last seen" even when no new data arrives.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSeenAt) return;
    const timer = setInterval(() => setTick((n) => n + 1), 30 * 1000);
    return () => clearInterval(timer);
  }, [lastSeenAt]);
  const label = presenceLabel(lastSeenAt ?? null);
  if (!label) return null;
  return (
    <Text style={[styles.text, label.online && styles.online]} numberOfLines={1}>
      {label.text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  online: { fontFamily: fonts.sansSemi, color: colors.palm },
});
