import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Heart } from "lucide-react-native";
import Tap from "@/components/kit/Tap";
import { toggleSaved, useSavedIds } from "@/lib/saved";
import { pressHaptic, tapHaptic } from "@/lib/haptics";
import { colors } from "@/theme";

// Heart on cards and the listing screen. Works logged out (saved on the phone).
// Saving pops the heart and gives a soft bump.
export default function SaveButton({ listingId, size = "sm" }: { listingId: string; size?: "sm" | "md" }) {
  const saved = useSavedIds().includes(String(listingId));
  const dim = size === "md" ? 44 : 36;
  const scale = useSharedValue(1);
  const tapped = useRef(false);

  // Pop only when this button was tapped, not when the list re-renders.
  // Reanimated skips the motion when the phone asks to reduce motion.
  useEffect(() => {
    if (!tapped.current) return;
    tapped.current = false;
    if (saved) scale.set(withSequence(withTiming(1.3, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 220 })));
  }, [saved, scale]);

  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save home"}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => {
        tapped.current = true;
        if (saved) tapHaptic();
        else pressHaptic();
        toggleSaved(String(listingId));
      }}
      style={[styles.button, { width: dim, height: dim, borderRadius: dim / 2 }]}
    >
      <Animated.View style={heartStyle}>
        <Heart size={size === "md" ? 22 : 18} color={saved ? colors.clay : colors.ink} fill={saved ? colors.clay : "transparent"} />
      </Animated.View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
});
