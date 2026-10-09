import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export default function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const s = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.base, s.box, (pressed || disabled) && styles.dim]}
    >
      {loading ? <ActivityIndicator color={s.text.color} /> : <Text style={[styles.text, s.text]}>{label}</Text>}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { box: { backgroundColor: colors.palm }, text: { color: colors.white } },
  secondary: { box: { borderWidth: 1, borderColor: colors.palm }, text: { color: colors.palm } },
  ghost: { box: {}, text: { color: colors.inkMuted } },
  danger: { box: { backgroundColor: colors.claySoft }, text: { color: colors.clay } },
};

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.control, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  text: { fontFamily: fonts.sansSemi, fontSize: 16 },
  dim: { opacity: 0.6 },
});
