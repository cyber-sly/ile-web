import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { ImageOff, MapPin } from "lucide-react-native";
import { keyFacts, listerLabel, placeLabel, priceParts } from "@shared/property.js";
import SaveButton from "@/components/SaveButton";
import { BoostedBadge, ListingTypeBadge, VerifiedBadge } from "@/components/kit";
import { categoryLine, listingBadges } from "@/lib/ui/listingBadges";
import { colors, fonts, radius, shadows } from "@/theme";

export type ListingRow = Record<string, any>;

export function coverPhoto(listing: ListingRow): string | null {
  return listing.image_urls?.[0] || listing.image_url || null;
}

// Listing card, like the website's PropertyCard: badges on the photo, a gold
// category line for land and shops, price, title, place, key facts, and who
// listed it.
// `width` fixes the size for sideways rows (Home); otherwise it fills the column.
export default function PropertyCard({ listing, width }: { listing: ListingRow; width?: number }) {
  const cover = coverPhoto(listing);
  const { amount, suffix } = priceParts(listing);
  const lister = listing.lister_type ? listerLabel(listing.lister_type) : null;
  const facts: string[] = keyFacts(listing);
  const gold = categoryLine(listing);
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={width ? { width } : null}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${amount}${suffix}, ${placeLabel(listing)}`}
      onPress={() => router.push({ pathname: "/listing/[id]", params: { id: String(listing.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.photoWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.photo} contentFit="cover" cachePolicy="disk" transition={150} alt="" />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <ImageOff color={colors.inkMuted} size={28} />
          </View>
        )}
        <View style={styles.badges}>
          {listingBadges(listing).map((b) => (b === "boosted" ? <BoostedBadge key={b} /> : <ListingTypeBadge key={b} type={listing.listing_type} />))}
        </View>
        <View style={styles.save}>
          <SaveButton listingId={String(listing.id)} />
        </View>
      </View>
      <View style={styles.body}>
        {gold ? <Text style={styles.gold}>{gold}</Text> : null}
        <Text style={styles.price}>
          {amount}
          {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={styles.placeRow}>
          <MapPin size={14} color={colors.inkMuted} />
          <Text style={styles.place} numberOfLines={1}>
            {placeLabel(listing)}
          </Text>
        </View>
        {facts.length > 0 && <Text style={styles.facts}>{facts.join(" · ")}</Text>}
        {lister || listing.is_verified ? (
          <View style={styles.footer}>
            {lister ? <Text style={styles.lister}>Listed by {String(lister).toLowerCase()}</Text> : <View />}
            {listing.is_verified ? <VerifiedBadge /> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden", ...shadows.card },
  pressed: { opacity: 0.92 },
  photoWrap: { aspectRatio: 4 / 3, backgroundColor: colors.line },
  photo: { width: "100%", height: "100%" },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  badges: { position: "absolute", top: 12, left: 12, flexDirection: "row", flexWrap: "wrap", gap: 6, right: 56 },
  save: { position: "absolute", top: 10, right: 10 },
  body: { padding: 16, gap: 3 },
  gold: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.8, color: colors.goldInk },
  price: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.ink },
  suffix: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  title: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink, marginTop: 1 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  place: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  facts: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink, marginTop: 8 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  lister: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
});
