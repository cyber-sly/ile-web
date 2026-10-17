import { View } from "react-native";
import { MAX_HOTEL_NAME, MAX_HOUSE_RULES } from "@shared/lister.js";
import Field from "@/components/Field";
import { Hint, wizardStyles, type StepProps } from "../parts";

const digits = (v: string) => v.replace(/[^0-9]/g, "");
// "1400" or "14:00" -> "14:00"; anything else is kept as typed until valid.
const time = (v: string) => {
  const d = v.replace(/[^0-9]/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
};

// Stays only: guests, minimum nights, check-in/out times, hotel name, rules.
export default function Stay({ values, set, errors }: StepProps) {
  const isHotel = values.propertyType === "hotel_room";
  return (
    <>
      {isHotel && (
        <Field
          label="Hotel name"
          value={values.hotelName}
          onChangeText={(hotelName) => set({ hotelName })}
          maxLength={MAX_HOTEL_NAME}
          placeholder="e.g. Eko Suites"
          hint="Your rooms are grouped under this name."
          error={errors.hotelName}
        />
      )}
      <View style={wizardStyles.row}>
        <View style={wizardStyles.flex}>
          <Field label="Bedrooms" optional value={values.bedrooms} onChangeText={(v) => set({ bedrooms: digits(v) })} keyboardType="number-pad" />
        </View>
        <View style={wizardStyles.flex}>
          <Field label="Bathrooms" optional value={values.bathrooms} onChangeText={(v) => set({ bathrooms: digits(v) })} keyboardType="number-pad" />
        </View>
      </View>
      <View style={wizardStyles.row}>
        <View style={wizardStyles.flex}>
          <Field label="Max guests" value={values.maxGuests} onChangeText={(v) => set({ maxGuests: digits(v) })} keyboardType="number-pad" error={errors.maxGuests} />
        </View>
        <View style={wizardStyles.flex}>
          <Field label="Minimum nights" value={values.minNights} onChangeText={(v) => set({ minNights: digits(v) })} keyboardType="number-pad" error={errors.minNights} />
        </View>
      </View>
      <View style={wizardStyles.row}>
        <View style={wizardStyles.flex}>
          <Field label="Check-in from" optional value={values.checkInTime} onChangeText={(v) => set({ checkInTime: time(v) })} keyboardType="number-pad" placeholder="14:00" error={errors.checkInTime} />
        </View>
        <View style={wizardStyles.flex}>
          <Field label="Check-out by" optional value={values.checkOutTime} onChangeText={(v) => set({ checkOutTime: time(v) })} keyboardType="number-pad" placeholder="11:00" error={errors.checkOutTime} />
        </View>
      </View>
      <Hint>Use 24-hour time, e.g. 14:00 for 2pm.</Hint>
      <Field
        label="House rules"
        optional
        value={values.houseRules}
        onChangeText={(houseRules) => set({ houseRules })}
        multiline
        maxLength={MAX_HOUSE_RULES}
        placeholder="e.g. No parties. No smoking indoors. Quiet after 10pm."
        error={errors.houseRules}
      />
    </>
  );
}
