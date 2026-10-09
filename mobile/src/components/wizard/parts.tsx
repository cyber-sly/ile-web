import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Chip from "@/components/Chip";
import { colors, fonts } from "@/theme";

export type StepProps = {
  values: Record<string, any>;
  set: (changes: Record<string, any>) => void;
  errors: Record<string, string>;
};

// A labelled row of chips for picking one option.
export function Choice({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function ErrorText({ children }: { children?: string }) {
  return children ? <Text style={styles.error}>{children}</Text> : null;
}

export const wizardStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
});

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
});
