import { StyleSheet, Text } from "react-native";
import Tap from "@/components/kit/Tap";
import { tapHaptic } from "@/lib/haptics";
import { colors, fonts } from "@/theme";

// Pill used for search tabs and filter choices. The pill is 36pt tall; the
// extra hitSlop makes the touch target 48pt.
export default function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={[styles.chip, selected && styles.on]}
    >
      <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  on: { backgroundColor: colors.palm, borderColor: colors.palm },
  text: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  textOn: { color: colors.white },
});
