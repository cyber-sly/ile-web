import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, fonts, radius } from "@/theme";

// Labelled text input with an optional hint or error under it. Password
// fields (secureTextEntry) get an eye button to show or hide what's typed.
export default function Field({
  label,
  hint,
  error,
  secureTextEntry,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const [shown, setShown] = useState(false);
  const isPassword = Boolean(secureTextEntry);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, isPassword && styles.inputWithButton, error ? styles.inputError : null]}
          accessibilityLabel={label}
          secureTextEntry={isPassword && !shown}
          {...props}
        />
        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? "Hide password" : "Show password"}
            hitSlop={8}
            onPress={() => setShown((s) => !s)}
            style={styles.eye}
          >
            {shown ? <EyeOff color={colors.inkMuted} size={20} /> : <Eye color={colors.inkMuted} size={20} />}
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  inputWithButton: { paddingRight: 48 },
  inputError: { borderColor: colors.clay },
  eye: { position: "absolute", right: 0, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, marginTop: 6 },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay, marginTop: 6 },
});
