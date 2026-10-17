import { CATEGORIES, defaultPeriod, LISTER_TYPES, PROPERTY_TYPES } from "@shared/property.js";
import { Choice, type StepProps } from "../parts";
import { useStaysReady } from "@/lib/stays";

type Option = { value: string; label: string; category?: string };

const PURPOSES = [
  { value: "rent", label: "For rent" },
  { value: "sale", label: "For sale" },
];

// Step 1: category, rent or sale, property type, and who is listing.
export default function What({ values, set }: StepProps) {
  const types = (PROPERTY_TYPES as Option[]).filter((t) => t.category === values.category);
  // Stays can be listed once supabase/stays.sql has been run.
  const staysReady = useStaysReady();
  const isStay = values.category === "stays";
  const categories = (CATEGORIES as Option[]).filter((c) => c.value !== "stays" || staysReady || isStay);
  return (
    <>
      <Choice
        label="Category"
        options={categories}
        value={values.category}
        onChange={(category) => {
          const first = (PROPERTY_TYPES as Option[]).find((t) => t.category === category)?.value;
          if (category === "stays") set({ category, propertyType: first, listingType: "rent", pricePeriod: "night" });
          else set({ category, propertyType: first, pricePeriod: defaultPeriod(values.listingType) });
        }}
      />
      {!isStay && <Choice label="Rent or sale" options={PURPOSES} value={values.listingType} onChange={(listingType) => set({ listingType, pricePeriod: defaultPeriod(listingType) })} />}
      <Choice label="Type" options={types} value={values.propertyType} onChange={(propertyType) => set({ propertyType })} />
      <Choice label="You are the" options={LISTER_TYPES as Option[]} value={values.listerType} onChange={(listerType) => set({ listerType })} />
    </>
  );
}
