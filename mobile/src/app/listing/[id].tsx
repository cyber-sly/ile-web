import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, MapPin, PlayCircle, Share2, ShieldCheck, WifiOff } from "lucide-react-native";
import { detailFacts, fullPlace, priceParts } from "@shared/property.js";
import { supabase } from "@/lib/supabase";
import { fetchListing, fetchSimilar, listingPhotos, listingState, listingUrl } from "@/lib/listing";
import { addRecent } from "@/lib/recent";
import PhotoCarousel from "@/components/PhotoCarousel";
import MoveInCost from "@/components/MoveInCost";
import ListerLine from "@/components/ListerLine";
import SaveButton from "@/components/SaveButton";
import PropertyCard from "@/components/PropertyCard";
import Button from "@/components/Button";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";

type Fact = { key: string; label: string; value: string | number };

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const online = useOnline();
  const listingQuery = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(supabase, id) });
  const listing = listingQuery.data ?? null;
  const similarQuery = useQuery({
    queryKey: ["similar", id],
    queryFn: () => fetchSimilar(supabase, listing!),
    enabled: Boolean(listing),
  });

  // Remember it for offline, and keep its first photos on the phone.
  useEffect(() => {
    if (!listing) return;
    addRecent(String(listing.id));
    Image.prefetch(listingPhotos(listing).slice(0, 6), { cachePolicy: "disk" }).catch(() => {});
  }, [listing]);

  async function share() {
    if (!listing) return;
    const url = listingUrl(String(listing.id));
    try {
      await Share.share({ message: `${listing.title}\n${url}`, url });
    } catch {}
  }

  const header = (
    <Stack.Screen
      options={{
        title: "",
        headerRight: () =>
          listing ? (
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Share" hitSlop={8} onPress={share} style={styles.iconButton}>
                <Share2 color={colors.ink} size={20} />
              </Pressable>
              <SaveButton listingId={String(listing.id)} />
            </View>
          ) : null,
      }}
    />
  );

  if (listingQuery.isPending) {
    return (
      <View style={styles.center}>
        {header}
        {online ? (
          <ActivityIndicator color={colors.palm} />
        ) : (
          <>
            <WifiOff color={colors.inkMuted} size={28} />
            <Text style={styles.centerText}>Connect to the internet to see this listing.</Text>
          </>
        )}
      </View>
    );
  }

  if (listingQuery.isError) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.centerText}>Couldn&apos;t load this listing.</Text>
        <Button label="Try again" variant="secondary" onPress={() => listingQuery.refetch()} />
      </View>
    );
  }

  const state = listingState(listing);
  if (!listing || state === "missing") {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.centerTitle}>This listing isn&apos;t available</Text>
        <Text style={styles.centerText}>It may have been removed by the lister.</Text>
        <Button label="Back to search" onPress={() => router.navigate("/")} />
      </View>
    );
  }

  const { amount, suffix } = priceParts(listing);
  const facts = detailFacts(listing) as Fact[];
  const paragraphs = String(listing.description || "")
    .split(/\n\s*\n/)
    .filter(Boolean);
  const videos: string[] = listing.video_urls || [];
  const features: string[] = listing.features || [];
  const similar = similarQuery.data || [];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {header}
      <PhotoCarousel photos={listingPhotos(listing)} title={listing.title} />
      <View style={styles.body}>
        {state === "unavailable" && (
          <View style={styles.unavailable}>
            <CircleAlert color={colors.goldInk} size={18} />
            <Text style={styles.unavailableText}>No longer available</Text>
          </View>
        )}

        <Text style={styles.price}>
          {amount}
          {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
        </Text>
        <Text style={styles.title}>{listing.title}</Text>
        <View style={styles.placeRow}>
          <MapPin color={colors.inkMuted} size={16} />
          <Text style={styles.place}>{fullPlace(listing)}</Text>
        </View>

        <View style={styles.facts}>
          {facts.map((f) => (
            <View key={f.key} style={styles.fact}>
              <Text style={styles.factLabel}>{f.label}</Text>
              <Text style={styles.factValue}>{String(f.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <ListerLine listing={listing} />
        </View>

        <View style={styles.notice}>
          <ShieldCheck color={colors.palm} size={18} />
          <Text style={styles.noticeText}>Viewings on Ile are free. Never pay an inspection fee to see a property.</Text>
        </View>

        <Text style={styles.sectionTitle}>About this {listing.category === "land" ? "land" : "place"}</Text>
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>The lister hasn&apos;t added a description yet.</Text>
        )}

        {features.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>What&apos;s included</Text>
            <View style={styles.features}>
              {features.map((f) => (
                <Text key={f} style={styles.feature}>
                  ✓ {f}
                </Text>
              ))}
            </View>
          </>
        )}

        {videos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Videos</Text>
            {videos.map((url, i) => (
              <Pressable
                key={url}
                accessibilityRole="button"
                onPress={() => WebBrowser.openBrowserAsync(url)}
                style={styles.video}
              >
                <PlayCircle color={colors.palm} size={22} />
                <Text style={styles.videoText}>Watch video{videos.length > 1 ? ` ${i + 1}` : ""}</Text>
              </Pressable>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Cost</Text>
        <MoveInCost listing={listing} />

        {similar.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Similar nearby</Text>
            <View style={styles.similar}>
              {similar.map((l) => (
                <PropertyCard key={l.id} listing={l} />
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  pageContent: { paddingBottom: 48 },
  body: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: colors.cream },
  centerTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, textAlign: "center" },
  centerText: { fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted, textAlign: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  unavailable: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.control, backgroundColor: colors.goldSoft },
  unavailableText: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.goldInk },
  price: { fontFamily: fonts.sansBold, fontSize: 26, color: colors.ink },
  suffix: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.inkMuted },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32, color: colors.ink },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  place: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted },
  facts: { flexDirection: "row", flexWrap: "wrap", borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  fact: { width: "50%", padding: 14, backgroundColor: colors.surface, borderColor: colors.line, borderBottomWidth: 1, borderRightWidth: 1 },
  factLabel: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkMuted },
  factValue: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink, marginTop: 4 },
  card: { padding: 16, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noticeText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 12 },
  paragraph: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted },
  features: { gap: 8 },
  feature: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  video: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  videoText: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.palm },
  similar: { gap: 14 },
});
