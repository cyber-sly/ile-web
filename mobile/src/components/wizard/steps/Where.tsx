import { useState } from "react";
import { NIGERIA, STATES, stateLabel } from "@shared/nigeria.js";
import { findNearMe, NEAR_ME_ERRORS } from "@/lib/nearMe";
import SelectField from "@/components/SelectField";
import Field from "@/components/Field";
import Button from "@/components/Button";
import { ErrorText, Hint, type StepProps } from "../parts";

// Step 2: state, LGA, area and street address. "Use my location" fills the first two.
export default function Where({ values, set, errors }: StepProps) {
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState("");
  const states = STATES.map((s: string) => ({ value: s, label: stateLabel(s) }));
  const lgas = values.state ? (NIGERIA as Record<string, string[]>)[values.state].map((l) => ({ value: l, label: l.replace("|", " / ") })) : [];

  async function useLocation() {
    setLocating(true);
    setProblem("");
    const result = await findNearMe();
    setLocating(false);
    if ("error" in result) setProblem(NEAR_ME_ERRORS[result.error]);
    else set({ state: result.state, lga: result.lga });
  }

  return (
    <>
      <Button label={locating ? "Finding you…" : "Use my location"} variant="secondary" loading={locating} onPress={useLocation} />
      <ErrorText>{problem}</ErrorText>
      <SelectField label="State" value={values.state} options={states} onChange={(state) => set({ state, lga: "" })} placeholder="Choose a state" />
      <ErrorText>{errors.state}</ErrorText>
      <SelectField
        label="LGA"
        value={values.lga}
        options={lgas}
        onChange={(lga) => set({ lga })}
        placeholder={values.state ? "Choose an LGA" : "Choose a state first"}
        disabled={!values.state}
      />
      <ErrorText>{errors.lga}</ErrorText>
      <Field label="Area or neighbourhood" value={values.area} onChangeText={(area) => set({ area })} placeholder="e.g. Lekki Phase 1" maxLength={80} />
      <Field label="Street address (optional)" value={values.address} onChangeText={(address) => set({ address })} maxLength={200} />
      <Hint>People see the area on your listing. Share the exact address when you confirm a booking.</Hint>
    </>
  );
}
