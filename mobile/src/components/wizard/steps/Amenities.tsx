import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { amenitiesFor } from "@shared/property.js";
import { amenityList, MAX_AMENITIES, MAX_AMENITY } from "@shared/lister.js";
import Chip from "@/components/Chip";
import { Button, Field } from "@/components/kit";
import { colors, fonts } from "@/theme";
import { ErrorText, Hint, type StepProps } from "../parts";

// Tick-box amenities for this kind of listing, plus the lister's own.
export default function Amenities({ values, set, errors }: StepProps) {
  const [custom, setCustom] = useState("");
  const chosen = amenityList(values.features) as string[];
  const listed = amenitiesFor(values.category) as string[];
  const extras = chosen.filter((a) => !listed.includes(a));
  const full = chosen.length >= MAX_AMENITIES;

  function toggle(label: string) {
    if (chosen.includes(label)) set({ features: chosen.filter((a) => a !== label) });
    else if (!full) set({ features: [...chosen, label] });
  }

  function addCustom() {
    const label = custom.trim().slice(0, MAX_AMENITY);
    if (!label || full || chosen.some((a) => a.toLowerCase() === label.toLowerCase())) return;
    set({ features: [...chosen, label] });
    setCustom("");
  }

  return (
    <>
      <Hint>Tick everything the place has. People filter by these.</Hint>
      <View style={styles.chips}>
        {[...listed, ...extras].map((label) => (
          <Chip key={label} label={label} selected={chosen.includes(label)} onPress={() => toggle(label)} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field
            label="Add your own"
            optional
            value={custom}
            onChangeText={setCustom}
            maxLength={MAX_AMENITY}
            placeholder="e.g. Rooftop terrace"
            accessibilityLabel="Add your own amenity"
            editable={!full}
            onSubmitEditing={addCustom}
          />
        </View>
        <View style={styles.add}>
          <Button label="Add amenity" variant="secondary" size="md" full={false} icon={Plus} disabled={full || !custom.trim()} onPress={addCustom} />
        </View>
      </View>
      {full ? <Text style={styles.muted}>You&apos;ve added the most amenities ({MAX_AMENITIES}).</Text> : null}
      <ErrorText>{errors.features}</ErrorText>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  flex: { flex: 1 },
  add: { paddingBottom: 2 },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
});
