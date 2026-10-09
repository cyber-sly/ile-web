import { StyleSheet, Switch, Text, View } from "react-native";
import { FURNISHING, SIZE_UNITS, TITLE_DOCUMENTS } from "@shared/property.js";
import { MAX_DESCRIPTION, MAX_TITLE } from "@shared/lister.js";
import Field from "@/components/Field";
import SelectField from "@/components/SelectField";
import { colors, fonts } from "@/theme";
import { Choice, wizardStyles, type StepProps } from "../parts";

type Option = { value: string; label: string };
const digits = (v: string) => v.replace(/[^0-9.]/g, "");

// Step 3: title, the facts that matter for this kind of property, description.
export default function Details({ values, set, errors }: StepProps) {
  const isHomes = values.category === "homes";
  const isLand = values.category === "land";
  return (
    <>
      <Field label="Title" value={values.title} onChangeText={(title) => set({ title })} placeholder="e.g. Bright 2-bedroom flat near the market" maxLength={MAX_TITLE} error={errors.title} />

      {isHomes && (
        <>
          <View style={wizardStyles.row}>
            <View style={wizardStyles.flex}>
              <Field label="Bedrooms" value={values.bedrooms} onChangeText={(v) => set({ bedrooms: digits(v) })} keyboardType="number-pad" error={errors.bedrooms} hint="0 for a room or studio" />
            </View>
            <View style={wizardStyles.flex}>
              <Field label="Bathrooms" value={values.bathrooms} onChangeText={(v) => set({ bathrooms: digits(v) })} keyboardType="number-pad" />
            </View>
          </View>
          <Field label="Toilets (optional)" value={values.toilets} onChangeText={(v) => set({ toilets: digits(v) })} keyboardType="number-pad" />
          <Choice
            label="Furnishing"
            options={[{ value: "", label: "Not stated" }, ...(FURNISHING as Option[])]}
            value={values.furnishing}
            onChange={(furnishing) => set({ furnishing })}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Serviced (cleaning, power or security included)</Text>
            <Switch value={values.serviced} onValueChange={(serviced) => set({ serviced })} trackColor={{ true: colors.palm, false: colors.lineStrong }} />
          </View>
        </>
      )}

      {isLand ? (
        <>
          <View style={wizardStyles.row}>
            <View style={wizardStyles.flex}>
              <Field label="Plot size" value={values.sizeValue} onChangeText={(v) => set({ sizeValue: digits(v) })} keyboardType="decimal-pad" error={errors.sizeValue} />
            </View>
          </View>
          <Choice label="Unit" options={SIZE_UNITS as Option[]} value={values.sizeUnit} onChange={(sizeUnit) => set({ sizeUnit })} />
          <SelectField
            label="Title document"
            value={values.titleDocument}
            options={(TITLE_DOCUMENTS as Option[]).map((t) => ({ value: t.value, label: t.label }))}
            onChange={(titleDocument) => set({ titleDocument })}
            placeholder="Not stated"
          />
        </>
      ) : (
        <Field label="Size in sqm (optional)" value={values.sizeValue} onChangeText={(v) => set({ sizeValue: digits(v) })} keyboardType="decimal-pad" />
      )}

      {values.category === "commercial" && (
        <View style={wizardStyles.row}>
          <View style={wizardStyles.flex}>
            <Field label="Toilets" value={values.toilets} onChangeText={(v) => set({ toilets: digits(v) })} keyboardType="number-pad" />
          </View>
          <View style={wizardStyles.flex}>
            <Field label="Parking spaces" value={values.parkingSpaces} onChangeText={(v) => set({ parkingSpaces: digits(v) })} keyboardType="number-pad" />
          </View>
        </View>
      )}

      <Field
        label="Description"
        value={values.description}
        onChangeText={(description) => set({ description })}
        multiline
        maxLength={MAX_DESCRIPTION}
        placeholder="What's nice about it? Water, power, road, neighbours, rules…"
        error={errors.description}
      />
      <Field
        label="What's included (optional)"
        value={values.features}
        onChangeText={(features) => set({ features })}
        placeholder="e.g. Borehole, Prepaid meter, Parking"
        hint="Separate items with commas."
      />
    </>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
});
