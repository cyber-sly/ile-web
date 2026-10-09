import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ImageOff } from "lucide-react-native";
import { keyFacts, placeLabel, priceParts } from "@shared/property.js";
import SaveButton from "@/components/SaveButton";
import { colors, fonts, radius } from "@/theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ListingRow = Record<string, any>;

export function coverPhoto(listing: ListingRow): string | null {
  return listing.image_urls?.[0] || listing.image_url || null;
}

// Listing card for search results, saved homes and similar listings.
export default function PropertyCard({ listing }: { listing: ListingRow }) {
  const cover = coverPhoto(listing);
  const { amount, suffix } = priceParts(listing, { short: true });
  const facts: string[] = keyFacts(listing);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${amount}${suffix}, ${placeLabel(listing)}`}
      onPress={() => router.push({ pathname: "/listing/[id]", params: { id: String(listing.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.photoWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={150} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <ImageOff color={colors.inkMuted} size={28} />
          </View>
        )}
        <View style={styles.save}>
          <SaveButton listingId={String(listing.id)} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.price}>
          {amount}
          <Text style={styles.suffix}>{suffix}</Text>
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.place} numberOfLines={1}>
          {placeLabel(listing)}
        </Text>
        {facts.length > 0 && <Text style={styles.facts}>{facts.join(" · ")}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  pressed: { opacity: 0.9 },
  photoWrap: { aspectRatio: 4 / 3, backgroundColor: colors.line },
  photo: { width: "100%", height: "100%" },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  save: { position: "absolute", top: 10, right: 10 },
  body: { padding: 14, gap: 3 },
  price: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink },
  suffix: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  title: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  place: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  facts: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink, marginTop: 4 },
});
