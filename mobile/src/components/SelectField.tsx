import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronDown, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius } from "@/theme";

export type Option = { value: string; label: string };

// A field that opens a searchable list (states, LGAs, property types...).
export default function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Any",
  disabled = false,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())),
    [options, query]
  );
  const current = options.find((o) => o.value === value)?.label;

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current || placeholder}`}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !current && styles.placeholder]} numberOfLines={1}>
          {current || placeholder}
        </Text>
        <ChevronDown color={colors.inkMuted} size={18} />
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => setOpen(false)}>
              <X color={colors.ink} size={24} />
            </Pressable>
          </View>
          {options.length > 8 && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${label.toLowerCase()}`}
              placeholderTextColor={colors.inkMuted}
              style={styles.search}
              autoCorrect={false}
            />
          )}
          <FlatList
            data={[{ value: "", label: placeholder }, ...shown]}
            keyExtractor={(o) => o.value || "any"}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => pick(item.value)} style={styles.option}>
                <Text style={[styles.optionText, item.value === value && styles.selected]}>{item.label}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.5 },
  value: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
  placeholder: { color: colors.inkMuted },
  modal: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  search: {
    marginHorizontal: 20,
    marginBottom: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  option: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  optionText: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
  selected: { fontFamily: fonts.sansSemi, color: colors.palm },
});
