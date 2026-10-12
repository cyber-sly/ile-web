import { Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors } from "@/theme";

// Star rating: read-only (no onChange) or tappable 1–5.
export default function Stars({ value, onChange, size = 16 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View style={styles.row} accessibilityRole={onChange ? "adjustable" : "text"} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star key={n} size={size} color={colors.gold} fill={n <= value ? colors.gold : "transparent"} />;
        return onChange ? (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`} hitSlop={6} onPress={() => onChange(n)}>
            {icon}
          </Pressable>
        ) : (
          icon
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4 },
});
