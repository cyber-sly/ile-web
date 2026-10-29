import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Building2, CalendarDays, Clock, Home as HomeIcon, Languages, MapPin, Star } from "lucide-react-native";
import { fetchListerProfile } from "@shared/account.js";
import { formatResponseTime, registrationLabel } from "@shared/profileDisplay.js";
import { listerLabel } from "@shared/property.js";
import { supabase } from "@/lib/supabase";
import PropertyCard from "@/components/PropertyCard";
import ReviewList from "@/components/ReviewList";
import Screen from "@/components/Screen";
import { Button, CardSkeleton, EmptyState, RowSkeleton } from "@/components/kit";
import { useOnline } from "@/components/OfflineBanner";
import ProfilePhoto from "@/components/ProfilePhoto";
import { colors, fonts, radius } from "@/theme";

const monthYear = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { month: "long", year: "numeric" });

// A lister's public profile: rating, reviews, live listings. Like /u/[id] on the website.
export default function ListerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const online = useOnline();
  const data = useQuery({ queryKey: ["lister-profile", id], queryFn: () => fetchListerProfile(supabase, id) });

  if (data.isPending && !online) return <Screen title="Connect to see this profile" />;
  if (data.isPending) {
    return (
      <View style={styles.skeleton}>
        <RowSkeleton />
        <CardSkeleton />
      </View>
    );
  }
  if (data.isError) {
    return (
      <Screen title="Couldn't load this profile" subtitle="Check your connection and try again.">
        <Button label="Try again" onPress={() => data.refetch()} />
      </Screen>
    );
  }
  if (!data.data) return <Screen title="This profile isn't available" subtitle="It may have been removed." />;

  const { profile, rating, reviews, listings, responseMinutes } = data.data;
  const lister = Boolean(profile.is_lister);
  // A chosen @username wins; otherwise a lister's business name, then their name.
  const name = profile.show_as === "username" && profile.username ? profile.display_name : profile.business_name?.trim() || profile.display_name;
  const reply = formatResponseTime(responseMinutes);
  const facts: { Icon: typeof Star; text: string }[] = [
    {
      Icon: Building2,
      text: profile.lister_type
        ? listerLabel(profile.lister_type) + (profile.business_name && profile.show_as !== "username" && profile.full_name ? ` · ${profile.full_name}` : "")
        : lister
          ? "Lister"
          : "Home-seeker",
    },
    profile.listing_since && { Icon: CalendarDays, text: `Listing property since ${profile.listing_since}` },
    { Icon: CalendarDays, text: `On Ile since ${monthYear(profile.created_at)}` },
    reply && { Icon: Clock, text: reply },
    profile.languages?.length && { Icon: Languages, text: profile.languages.join(", ") },
    profile.areas_covered?.length && { Icon: MapPin, text: `Covers ${profile.areas_covered.join(", ")}` },
    profile.registration_body && { Icon: Award, text: `Registered with ${registrationLabel(profile.registration_body)}` },
    profile.office_address && { Icon: Building2, text: profile.office_address },
  ].filter(Boolean) as { Icon: typeof Star; text: string }[];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "" }} />
      <View style={styles.header}>
        {profile.avatar_url ? (
          <ProfilePhoto uri={profile.avatar_url} name={name} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initial]}>
            <Text style={styles.initialText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{name}</Text>
        {rating?.total ? (
          <View style={styles.ratingRow}>
            <Star size={16} color={colors.gold} fill={colors.gold} />
            <Text style={styles.rating}>
              {Number(rating.average).toFixed(1)} · {rating.total} review{rating.total === 1 ? "" : "s"}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>No reviews yet</Text>
        )}
        {rating?.accurate_pct !== null && rating?.accurate_pct !== undefined ? (
          <Text style={styles.muted}>{rating.accurate_pct}% say listings were accurate</Text>
        ) : null}
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.facts}>
        {facts.map(({ Icon, text }) => (
          <View key={text} style={styles.fact}>
            <Icon color={colors.palm} size={16} />
            <Text style={styles.factText}>{text}</Text>
          </View>
        ))}
      </View>

      {lister && <Text style={styles.section}>Listed now ({listings.length})</Text>}
      {!lister ? null : listings.length === 0 ? (
        <EmptyState icon={HomeIcon} title="Nothing listed right now">
          Check back later, or browse other listings on Ile.
        </EmptyState>
      ) : (
        <View style={styles.listings}>
          {listings.map((l: Record<string, any>) => (
            <PropertyCard key={l.id} listing={l} />
          ))}
        </View>
      )}

      {lister && (
        <>
          <Text style={styles.section}>Reviews</Text>
          <ReviewList reviews={reviews} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  skeleton: { flex: 1, gap: 16, padding: 16, backgroundColor: colors.cream },
  header: { alignItems: "center", gap: 6 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 32, color: colors.palm },
  name: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink, textAlign: "center" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rating: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  bio: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  facts: { gap: 10, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  fact: { flexDirection: "row", alignItems: "center", gap: 10 },
  factText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  section: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 8 },
  listings: { gap: 14 },
});
