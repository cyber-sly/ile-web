import { StyleSheet, Text, View } from "react-native";
import { formatDate } from "@shared/format.js";
import Stars from "@/components/Stars";
import { colors, fonts, radius } from "@/theme";

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  listing_accurate?: boolean | null;
  created_at: string;
  listings?: { id: string; title: string } | null;
};

// Reviews of a lister. Reviewers stay anonymous: only the stars, comment,
// listing and date are shown.
export default function ReviewList({ reviews }: { reviews: (Review & Record<string, unknown>)[] }) {
  if (reviews.length === 0) {
    return <Text style={styles.empty}>No reviews yet. Reviews appear after people view a property.</Text>;
  }
  return (
    <View style={styles.list}>
      {reviews.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={styles.head}>
            <Stars value={r.rating} size={14} />
            <Text style={styles.date}>{formatDate(String(r.created_at).slice(0, 10))}</Text>
          </View>
          {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}
          <Text style={styles.meta}>
            {r.listings?.title ? `Viewed ${r.listings.title}` : "Viewed a property"}
            {r.listing_accurate === true ? " · Listing was accurate" : r.listing_accurate === false ? " · Listing wasn't accurate" : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  card: { gap: 6, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  comment: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: colors.ink },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  empty: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
});
