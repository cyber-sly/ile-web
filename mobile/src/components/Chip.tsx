import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/theme";

// Pill used for search tabs and filter choices.
export default function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.on]}
    >
      <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  on: { backgroundColor: colors.palm, borderColor: colors.palm },
  text: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  textOn: { color: colors.white },
});
