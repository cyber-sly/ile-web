import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme";
import Tap from "./Tap";

// Website ui/Field.jsx: visible label (with "Optional"), an icon inside the
// box, a hint or error under it. Password fields get the show/hide eye.
export default function Field({
  label,
  hint,
  error,
  optional,
  icon: Icon,
  secureTextEntry,
  multiline,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string; optional?: boolean; icon?: LucideIcon }) {
  const [shown, setShown] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {optional ? <Text style={styles.optional}>Optional</Text> : null}
      </View>
      <View>
        {Icon ? (
          <View style={styles.icon} pointerEvents="none">
            <Icon size={17} color={colors.inkMuted} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.inkMuted}
          style={[
            styles.input,
            multiline && styles.multiline,
            Icon ? styles.withIcon : null,
            isPassword && styles.withButton,
            error ? styles.inputError : null,
          ]}
          accessibilityLabel={label}
          secureTextEntry={isPassword && !shown}
          multiline={multiline}
          {...props}
        />
        {isPassword && (
          <Tap
            accessibilityRole="button"
            accessibilityLabel={shown ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setShown((s) => !s)}
            style={styles.eye}
          >
            {shown ? <EyeOff color={colors.inkMuted} size={20} /> : <Eye color={colors.inkMuted} size={20} />}
          </Tap>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  optional: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  withIcon: { paddingLeft: 40 },
  withButton: { paddingRight: 48 },
  inputError: { borderColor: colors.clay },
  icon: { position: "absolute", left: 14, top: 15, zIndex: 1 },
  eye: { position: "absolute", right: 0, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, marginTop: 6 },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay, marginTop: 6 },
});
