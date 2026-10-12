import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme";

// Website ui/EmptyState.jsx: dashed box, round icon, serif heading, text, action.
export default function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  tone = "palm",
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "palm" | "clay";
}) {
  return (
    <View style={styles.box}>
      {Icon ? (
        <View style={[styles.iconWrap, tone === "clay" ? styles.clay : styles.palm]}>
          <Icon size={26} color={tone === "clay" ? colors.clay : colors.palm} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {children ? (typeof children === "string" ? <Text style={styles.body}>{children}</Text> : children) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 40,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
    backgroundColor: "rgba(255,253,248,0.6)",
  },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  palm: { backgroundColor: colors.palmSoft },
  clay: { backgroundColor: colors.claySoft },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.ink, textAlign: "center" },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.inkMuted, textAlign: "center" },
  action: { alignSelf: "stretch", alignItems: "center" },
});
