import { useEffect, useState } from "react";
import ReportSheet from "@/components/ReportSheet";
import { useSession } from "@/lib/useSession";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { Check, CircleAlert, Flag, MapPin, PlayCircle, Share2, ShieldCheck, WifiOff } from "lucide-react-native";
import { detailFacts, fullPlace, isBoosted, priceParts } from "@shared/property.js";
import { supabase } from "@/lib/supabase";
import { fetchListing, fetchSimilar, listingPhotos, listingState } from "@/lib/listing";
import { useReferralSummary } from "@/lib/referrals";
import ShareSheet from "@/components/ShareSheet";
import { addRecent } from "@/lib/recent";
import PhotoCarousel from "@/components/PhotoCarousel";
import MoveInCost from "@/components/MoveInCost";
import ListerLine from "@/components/ListerLine";
import SaveButton from "@/components/SaveButton";
import PropertyCard from "@/components/PropertyCard";
import { BoostedBadge, Button, ListingTypeBadge, ServicedBadge, VerifiedBadge } from "@/components/kit";
import { FACT_ICONS } from "@/lib/ui/factIcons";
import ListingActions from "@/components/ListingActions";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";

type Fact = { key: string; label: string; value: string | number };

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const online = useOnline();
  const { user } = useSession();
  const [reporting, setReporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  // The title moves into the header once the photos scroll out of view.
  const [titleInHeader, setTitleInHeader] = useState(false);
  const photoHeight = (useWindowDimensions().width * 3) / 4;
  const summary = useReferralSummary(user?.id);
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

  function share() {
    if (listing) setSharing(true);
  }

  const header = (
    <Stack.Screen
      options={{
        title: titleInHeader && listing ? listing.title : "",
        headerRight: () =>
          listing ? (
            <View style={styles.headerActions}>
              <Tap accessibilityRole="button" accessibilityLabel="Share" hitSlop={8} onPress={share} style={styles.iconButton}>
                <Share2 color={colors.ink} size={20} />
              </Tap>
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
        <Button label="Back to search" onPress={() => router.navigate("/search")} />
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
    <View style={styles.page}>
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      scrollEventThrottle={32}
      onScroll={(e) => {
        const past = e.nativeEvent.contentOffset.y > photoHeight - 40;
        if (past !== titleInHeader) setTitleInHeader(past);
      }}
    >
      {header}
      <PhotoCarousel photos={listingPhotos(listing)} title={listing.title} />
      <View style={styles.body}>
        {state === "unavailable" && (
          <View style={styles.unavailable}>
            <CircleAlert color={colors.goldInk} size={18} />
            <Text style={styles.unavailableText}>No longer available</Text>
          </View>
        )}

        <View style={styles.badges}>
          <ListingTypeBadge type={listing.listing_type} />
          {listing.serviced ? <ServicedBadge /> : null}
          {listing.is_verified ? <VerifiedBadge /> : null}
          {isBoosted(listing) ? <BoostedBadge /> : null}
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {listing.title}
        </Text>
        <View style={styles.placeRow}>
          <MapPin color={colors.inkMuted} size={17} />
          <Text style={styles.place}>{fullPlace(listing)}</Text>
        </View>
        <Text style={styles.price}>
          {amount}
          {suffix ? <Text style={styles.suffix}> {suffix}</Text> : null}
        </Text>

        <View style={styles.facts}>
          {facts.map((f, i) => {
            const Icon = FACT_ICONS[f.key];
            const wide = i === facts.length - 1 && facts.length % 2 === 1;
            return (
              <View key={f.key} style={[styles.fact, wide && styles.factWide]}>
                <View style={styles.factLabelRow}>
                  {Icon ? <Icon color={colors.inkMuted} size={14} /> : null}
                  <Text style={styles.factLabel}>{f.label}</Text>
                </View>
                <Text style={styles.factValue}>{String(f.value)}</Text>
              </View>
            );
          })}
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
          <Text style={styles.muted}>The lister hasn&apos;t added a description yet. Book a viewing to see it in person.</Text>
        )}

        {features.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>What&apos;s included</Text>
            <View style={styles.features}>
              {features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <View style={styles.tick}>
                    <Check color={colors.palm} size={15} strokeWidth={3} />
                  </View>
                  <Text style={styles.feature}>{f}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {videos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Video tour</Text>
            {videos.map((url, i) => (
              <Tap
                key={url}
                accessibilityRole="button"
                onPress={() => WebBrowser.openBrowserAsync(url)}
                style={styles.video}
              >
                <PlayCircle color={colors.palm} size={22} />
                <Text style={styles.videoText}>Watch video{videos.length > 1 ? ` ${i + 1}` : ""}</Text>
              </Tap>
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
        {user && user.id !== listing.landlord_id && (
          <Tap accessibilityRole="button" onPress={() => setReporting(true)} style={styles.report}>
            <Flag color={colors.inkMuted} size={15} />
            <Text style={styles.reportText}>Report this listing</Text>
          </Tap>
        )}
      </View>
      {user && (
        <ReportSheet visible={reporting} listingId={String(listing.id)} userId={user.id} onClose={() => setReporting(false)} />
      )}
    </ScrollView>
    <ListingActions listing={listing} />
    <ShareSheet listing={listing} code={summary.data?.code ?? null} visible={sharing} onClose={() => setSharing(false)} />
    </View>
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
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  price: { fontFamily: fonts.sansBold, fontSize: 24, color: colors.ink },
  suffix: { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.inkMuted },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, letterSpacing: -0.75, color: colors.ink, marginTop: -2 },
  placeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  place: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted },
  // 1 px line between cells: the line colour shows through the gaps.
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 1,
    marginTop: 8,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  fact: { flexGrow: 1, flexBasis: "45%", padding: 16, backgroundColor: colors.surface },
  factWide: { flexBasis: "100%" },
  factLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  factLabel: { fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkMuted },
  factValue: { fontFamily: fonts.sansBold, fontSize: 15, lineHeight: 20, color: colors.ink, marginTop: 6 },
  card: { padding: 16, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noticeText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 12 },
  paragraph: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 27, color: "rgba(27,38,64,0.85)" },
  muted: { fontFamily: fonts.sans, fontSize: 15, color: colors.inkMuted },
  features: { gap: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  tick: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  feature: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
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
  report: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", paddingVertical: 12, marginTop: 8 },
  reportText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkMuted, textDecorationLine: "underline" },
});
