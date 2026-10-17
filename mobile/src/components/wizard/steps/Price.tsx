import { draftToRow } from "@shared/lister.js";
import { periodLabel, periodOptions } from "@shared/property.js";
import Field from "@/components/Field";
import MoveInCost from "@/components/MoveInCost";
import { Choice, Hint, wizardStyles, type StepProps } from "../parts";
import { View } from "react-native";

const digits = (v: string) => v.replace(/[^0-9.]/g, "");
const naira = (v: string) => (v ? Number(v).toLocaleString("en-NG") : "");

// Step 4: price and every fee, with the live total people will see.
export default function Price({ values, set, errors }: StepProps) {
  const isStay = values.category === "stays";
  const isRent = values.listingType === "rent" || isStay;
  const isLand = values.category === "land";
  const periods = (periodOptions(values.listingType, values.category) as string[]).map((p) => ({ value: p, label: periodLabel(p) }));
  return (
    <>
      <Field
        label={isStay ? "Price per night (₦)" : isRent ? "Rent (₦)" : "Price (₦)"}
        value={naira(values.price)}
        onChangeText={(v) => set({ price: v.replace(/[^0-9]/g, "") })}
        keyboardType="number-pad"
        error={errors.price}
      />
      {periods.length > 1 && <Choice label="Price is" options={periods} value={values.pricePeriod} onChange={(pricePeriod) => set({ pricePeriod })} />}

      {isStay && (
        <>
          <Field label="Cleaning fee (₦, once per stay)" value={naira(values.cleaningFee)} onChangeText={(v) => set({ cleaningFee: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" error={errors.cleaningFee} />
          <Field label="Caution deposit (₦, refundable)" value={naira(values.caution)} onChangeText={(v) => set({ caution: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" />
          <Hint>Leave a fee empty if there isn&apos;t one. Guests see the full total before they book.</Hint>
        </>
      )}
      {!isStay && <><View style={wizardStyles.row}>
        <View style={wizardStyles.flex}>
          <Field label="Agency fee (%)" value={values.agencyFee} onChangeText={(v) => set({ agencyFee: digits(v) })} keyboardType="decimal-pad" error={errors.agencyFee} />
        </View>
        <View style={wizardStyles.flex}>
          <Field label="Legal fee (%)" value={values.legalFee} onChangeText={(v) => set({ legalFee: digits(v) })} keyboardType="decimal-pad" error={errors.legalFee} />
        </View>
      </View>
      {isRent && (
        <Field label="Caution deposit (₦, refundable)" value={naira(values.caution)} onChangeText={(v) => set({ caution: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" />
      )}
      {!isLand && (
        <Field label="Service charge per year (₦)" value={naira(values.serviceCharge)} onChangeText={(v) => set({ serviceCharge: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" />
      )}
      <Hint>Leave a fee empty if there isn&apos;t one. Ile shows home-seekers the full amount up front.</Hint>
      {Number(values.price) > 0 && <MoveInCost listing={draftToRow(values)} />}
      </>}
    </>
  );
}
