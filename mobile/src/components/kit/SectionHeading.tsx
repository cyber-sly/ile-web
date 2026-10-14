import { StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { colors, fonts } from "@/theme";
import Tap from "./Tap";

// Website section heading: large serif title, optional line under it, and an
// optional "See all"-style link on the right.
export default function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Tap accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} hitSlop={8} style={styles.action}>
          <Text style={styles.actionText}>{action.label}</Text>
          <ArrowRight size={16} color={colors.palm} />
        </Tap>
      ) : null}
    </View>
  );
}

// Page title used at the top of tab screens (website h1).
export function PageTitle({ children }: { children: string }) {
  return (
    <Text style={styles.page} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  text: { flex: 1, gap: 4 },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  action: { flexDirection: "row", alignItems: "center", gap: 4, paddingBottom: 3 },
  actionText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  page: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: colors.ink },
});
