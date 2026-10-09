import { StyleSheet, Text, View } from "react-native";
import { formatNaira } from "@shared/format.js";
import Screen from "@/components/Screen";
import { colors, fonts, radius } from "@/theme";

// Placeholder until Milestone 2 (search and listings). The price line proves
// the app is using the website's shared business rules.
export default function SearchScreen() {
  return (
    <Screen title="Find your place" subtitle="Homes, land and shops across Nigeria. Search arrives in the next update.">
      <View style={styles.card}>
        <Text style={styles.label}>Sample price, formatted by the shared rules</Text>
        <Text style={styles.price}>{formatNaira(3500000)}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.card, padding: 16 },
  label: { fontFamily: fonts.sans, color: colors.inkMuted, fontSize: 13 },
  price: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 24, marginTop: 4 },
});
