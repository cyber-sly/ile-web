import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native";
import { colors, radius, shadows } from "@/theme";

// Grey placeholder shapes while content loads (website .skeleton). Pulses
// gently unless the person asked the phone to reduce motion.
export function Skeleton({ width = "100%", height, rounded = radius.control }: { width?: number | `${number}%`; height: number; rounded?: number }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          ])
        );
        loop.start();
      })
      .catch(() => {});
    return () => loop?.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: colors.line, opacity }} />;
}

// A listing card's shape.
export function CardSkeleton({ width }: { width?: number }) {
  return (
    <View style={[styles.card, width ? { width } : null]} accessibilityLabel="Loading">
      <Skeleton height={width ? (width * 3) / 4 : 220} rounded={0} />
      <View style={styles.body}>
        <Skeleton height={18} width="45%" />
        <Skeleton height={14} width="80%" />
        <Skeleton height={14} width="60%" />
      </View>
    </View>
  );
}

// A list row's shape (inbox, viewings, requests).
export function RowSkeleton() {
  return (
    <View style={styles.row} accessibilityLabel="Loading">
      <Skeleton height={44} width={44} rounded={22} />
      <View style={styles.rowText}>
        <Skeleton height={14} width="55%" />
        <Skeleton height={12} width="85%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: "hidden", ...shadows.card },
  body: { padding: 16, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowText: { flex: 1, gap: 8 },
});
