import { StyleSheet, Text, View } from "react-native";
import { feeWarning, moveInCost } from "@shared/property.js";
import { formatNaira } from "@shared/format.js";
import type { ListingRow } from "@/components/PropertyCard";
import { colors, fonts, radius } from "@/theme";

type Cost = { rows: { label: string; amount: number }[]; total: number; hasExtras: boolean };

// Rent/price plus every fee the lister declared, added up.
export default function MoveInCost({ listing }: { listing: ListingRow }) {
  const { rows, total, hasExtras } = moveInCost(listing) as Cost;
  const warning = feeWarning(listing);
  const isRent = listing.listing_type === "rent";
  return (
    <View style={styles.box}>
      <Text style={styles.heading}>{isRent ? "Total to move in" : "Total upfront"}</Text>
      {rows.map((r) => (
        <View key={r.label} style={styles.row}>
          <Text style={styles.label}>{r.label}</Text>
          <Text style={styles.amount}>{formatNaira(r.amount)}</Text>
        </View>
      ))}
      {hasExtras && (
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatNaira(total)}</Text>
        </View>
      )}
      {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      <Text style={styles.note}>As stated by the lister. Confirm every fee before you pay.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, padding: 16, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  heading: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted },
  amount: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  totalRow: { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  totalLabel: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  total: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.ink },
  warning: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay },
  note: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
});
