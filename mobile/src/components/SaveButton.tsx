import { Pressable, StyleSheet } from "react-native";
import { Heart } from "lucide-react-native";
import { toggleSaved, useSavedIds } from "@/lib/saved";
import { colors } from "@/theme";

// Heart on cards and the listing screen. Works logged out (saved on the phone).
export default function SaveButton({ listingId, size = "sm" }: { listingId: string; size?: "sm" | "md" }) {
  const saved = useSavedIds().includes(String(listingId));
  const dim = size === "md" ? 44 : 36;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save home"}
      accessibilityState={{ selected: saved }}
      hitSlop={8}
      onPress={() => toggleSaved(String(listingId))}
      style={[styles.button, { width: dim, height: dim, borderRadius: dim / 2 }]}
    >
      <Heart size={size === "md" ? 22 : 18} color={saved ? colors.palm : colors.ink} fill={saved ? colors.palm : "transparent"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
});
