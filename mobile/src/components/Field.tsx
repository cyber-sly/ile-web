import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, fonts, radius } from "@/theme";

// Labelled text input with an optional hint or error under it.
export default function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityLabel={label}
        {...props}
      />
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
  inputError: { borderColor: colors.clay },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted, marginTop: 6 },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay, marginTop: 6 },
});
