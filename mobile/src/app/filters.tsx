import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { NIGERIA, STATES, stateLabel } from "@shared/nigeria.js";
import { PROPERTY_TYPES, TITLE_DOCUMENTS } from "@shared/property.js";
import { SORTS } from "@shared/search.js";
import { DEFAULT_FILTERS, useFilters } from "@/lib/filters";
import Chip from "@/components/Chip";
import Button from "@/components/Button";
import SelectField from "@/components/SelectField";
import { colors, fonts, radius } from "@/theme";

type Choice = { value: string; label: string; category?: string };

const BEDS = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];
const PURPOSES = [
  { value: "", label: "Any" },
  { value: "rent", label: "For rent" },
  { value: "sale", label: "For sale" },
];

const digits = (v: string) => v.replace(/[^0-9]/g, "");

// Filter sheet opened from the Search tab. Changes apply straight away.
export default function FiltersSheet() {
  const [filters, change] = useFilters();
  const [min, setMin] = useState(filters.min);
  const [max, setMax] = useState(filters.max);

  const category = filters.tab === "rent" || filters.tab === "sale" ? "homes" : filters.tab;
  const types = (PROPERTY_TYPES as Choice[]).filter((t) => t.category === category);
  const states = STATES.map((s: string) => ({ value: s, label: stateLabel(s) }));
  const lgas = filters.state ? (NIGERIA as Record<string, string[]>)[filters.state].map((l) => ({ value: l, label: l.replace("|", " / ") })) : [];

  function applyPrices() {
    if (min !== filters.min || max !== filters.max) change({ min, max });
  }

  function done() {
    applyPrices();
    router.back();
  }

  function clear() {
    setMin("");
    setMax("");
    change({ ...DEFAULT_FILTERS, tab: filters.tab, q: filters.q });
  }

  return (
    <View style={styles.sheet}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Filters</Text>

        {category !== "homes" && (
          <Section label="Looking to">
            {PURPOSES.map((p) => (
              <Chip key={p.value} label={p.label} selected={filters.purpose === p.value} onPress={() => change({ purpose: p.value })} />
            ))}
          </Section>
        )}

        <SelectField label="State" value={filters.state} options={states} onChange={(v) => change({ state: v })} placeholder="Any state" />
        <SelectField
          label="LGA"
          value={filters.lga}
          options={lgas}
          onChange={(v) => change({ lga: v })}
          placeholder={filters.state ? "Any LGA" : "Pick a state first"}
          disabled={!filters.state}
        />
        <SelectField label="Property type" value={filters.ptype} options={types} onChange={(v) => change({ ptype: v })} placeholder="Any type" />

        <View style={styles.prices}>
          <PriceInput label="Min price (₦)" value={min} onChange={setMin} onBlur={applyPrices} />
          <PriceInput label="Max price (₦)" value={max} onChange={setMax} onBlur={applyPrices} />
        </View>

        {category === "homes" && (
          <Section label="Bedrooms">
            {BEDS.map((b) => (
              <Chip key={b.value} label={b.label} selected={filters.beds === b.value} onPress={() => change({ beds: b.value })} />
            ))}
          </Section>
        )}

        {category === "land" && (
          <SelectField
            label="Title document"
            value={filters.title}
            options={(TITLE_DOCUMENTS as Choice[]).map((t) => ({ value: t.value, label: t.label }))}
            onChange={(v) => change({ title: v })}
            placeholder="Any title"
          />
        )}

        <Section label="Sort by">
          {(SORTS as Choice[]).map((s) => (
            <Chip
              key={s.value}
              label={s.label}
              selected={(filters.sort || "new") === s.value}
              onPress={() => change({ sort: s.value === "new" ? "" : s.value })}
            />
          ))}
        </Section>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.flex}>
          <Button label="Clear" variant="secondary" onPress={clear} />
        </View>
        <View style={styles.flex}>
          <Button label="Show results" onPress={done} />
        </View>
      </View>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function PriceInput({ label, value, onChange, onBlur }: { label: string; value: string; onChange: (v: string) => void; onBlur: () => void }) {
  return (
    <View style={styles.price}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value ? Number(value).toLocaleString("en-NG") : ""}
        onChangeText={(v) => onChange(digits(v))}
        onBlur={onBlur}
        keyboardType="number-pad"
        placeholder="Any"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 18, paddingBottom: 32 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  section: { gap: 8 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prices: { flexDirection: "row", gap: 12 },
  price: { flex: 1, gap: 6 },
  input: {
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
  footer: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  flex: { flex: 1 },
});
