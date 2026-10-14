import { StyleSheet, Text, View } from "react-native";
import { draftToRow } from "@shared/lister.js";
import { fullPlace, keyFacts, priceParts, typeLabel } from "@shared/property.js";
import { STEPS, STEP_TITLES, type Step } from "@/lib/wizardSteps";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";

type Props = {
  values: Record<string, any>;
  photoCount: number;
  videoCount: number;
  errors: Record<string, string>;
  goTo: (step: number) => void;
};

// Step 6: everything at a glance, with a link back to each step.
export default function Review({ values, photoCount, videoCount, errors, goTo }: Props) {
  const row = draftToRow(values);
  const { amount, suffix } = priceParts(row);
  const sections: { step: Step; lines: string[] }[] = [
    { step: "what", lines: [`${typeLabel(row.property_type)} · ${row.listing_type === "sale" ? "For sale" : "For rent"}`] },
    { step: "where", lines: [fullPlace(row) || "No location yet", row.address].filter(Boolean) as string[] },
    { step: "details", lines: [row.title || "No title yet", (keyFacts(row) as string[]).join(" · ")].filter(Boolean) },
    { step: "price", lines: [Number(row.price) > 0 ? `${amount}${suffix}` : "No price yet"] },
    { step: "photos", lines: [`${photoCount} photo${photoCount === 1 ? "" : "s"}${videoCount ? `, ${videoCount} video${videoCount === 1 ? "" : "s"}` : ""}`] },
  ];
  const problems = Object.values(errors);

  return (
    <>
      {problems.length > 0 && (
        <View style={styles.problems}>
          <Text style={styles.problemTitle}>Before you publish</Text>
          {problems.map((p) => (
            <Text key={p} style={styles.problem}>
              • {p}
            </Text>
          ))}
        </View>
      )}
      {sections.map((s) => (
        <View key={s.step} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>{STEP_TITLES[s.step]}</Text>
            <Tap accessibilityRole="button" accessibilityLabel={`Change ${STEP_TITLES[s.step]}`} onPress={() => goTo(STEPS.indexOf(s.step))}>
              <Text style={styles.change}>Change</Text>
            </Tap>
          </View>
          {s.lines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  problems: { gap: 4, padding: 14, borderRadius: radius.card, backgroundColor: colors.claySoft },
  problemTitle: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.clay },
  problem: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  card: { gap: 4, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.inkMuted },
  change: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  line: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
});
