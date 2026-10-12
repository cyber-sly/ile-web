import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme";

// Website ui/Button.js variants and sizes.
export type ButtonVariant = "primary" | "secondary" | "neutral" | "ghost" | "danger" | "danger-ghost" | "onDark";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, { box: object; fg: string }> = {
  primary: { box: { backgroundColor: colors.palm }, fg: colors.white },
  secondary: { box: { borderWidth: 1, borderColor: colors.palm }, fg: colors.palm },
  neutral: { box: { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface }, fg: colors.ink },
  ghost: { box: {}, fg: colors.inkMuted },
  danger: { box: { backgroundColor: colors.clay }, fg: colors.white },
  "danger-ghost": { box: {}, fg: colors.clay },
  onDark: { box: { backgroundColor: colors.surface }, fg: colors.ink },
};

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 14, fontSize: 14 },
  md: { height: 44, paddingHorizontal: 20, fontSize: 14 },
  lg: { height: 48, paddingHorizontal: 24, fontSize: 16 },
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  full = true,
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight = false,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconRight?: boolean;
}) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const icon = Icon ? <Icon size={size === "sm" ? 15 : 18} color={v.fg} /> : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { height: s.height, paddingHorizontal: s.paddingHorizontal },
        full ? styles.full : styles.fit,
        v.box,
        (pressed || disabled) && styles.dim,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {!iconRight && icon}
          <Text style={[styles.text, { color: v.fg, fontSize: s.fontSize }]}>{label}</Text>
          {iconRight && icon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  full: { alignSelf: "stretch" },
  fit: { alignSelf: "flex-start" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontFamily: fonts.sansSemi },
  dim: { opacity: 0.5 },
});
