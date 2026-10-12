import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/theme";

// The website's logo (Logo.jsx): serif "Ile" with a coloured full stop.
export default function Logo({ onDark = false, size = 26 }: { onDark?: boolean; size?: number }) {
  return (
    <Text style={[styles.logo, { fontSize: size }, onDark && styles.onDark]} accessibilityLabel="Ile">
      Ile<Text style={{ color: onDark ? colors.gold : colors.palm }}>.</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: { fontFamily: fonts.serif, color: colors.ink, letterSpacing: -0.5 },
  onDark: { color: colors.white },
});
