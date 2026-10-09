import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { Heart, WifiOff } from "lucide-react-native";
import { pluralize } from "@shared/format.js";
import { supabase } from "@/lib/supabase";
import { useSavedListings } from "@/lib/savedListings";
import { refreshSaved } from "@/lib/saved";
import { useRecentIds } from "@/lib/recent";
import { fetchListing } from "@/lib/listing";
import { useSession } from "@/lib/useSession";
import PropertyCard, { type ListingRow } from "@/components/PropertyCard";
import Button from "@/components/Button";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts } from "@/theme";

const RECENT_SHOWN = 6;

function Gap() {
  return <View style={styles.gap} />;
}

// Saved homes (synced with the website when logged in) and recently viewed
// homes. Both work offline from what's kept on the phone.
export default function SavedScreen() {
  const { user } = useSession();
  const online = useOnline();
  const saved = useSavedListings();
  const recentIds = useRecentIds()
    .filter((id) => !saved.ids.includes(id))
    .slice(0, RECENT_SHOWN);
  const recent = useQueries({
    queries: recentIds.map((id) => ({ queryKey: ["listing", id], queryFn: () => fetchListing(supabase, id) })),
  })
    .map((q) => q.data)
    .filter((l): l is ListingRow => Boolean(l));

  const waiting = saved.ids.length > 0 && saved.listings.length === 0 && saved.isPending;

  async function refresh() {
    await refreshSaved();
    await saved.refetch();
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Saved homes</Text>
      {saved.listings.length > 0 && <Text style={styles.count}>{pluralize(saved.listings.length, "home")}</Text>}
      {!user && (
        <Text style={styles.hint}>
          <Link href="/login" style={styles.link}>
            Log in
          </Link>{" "}
          to keep saved homes on all your devices.
        </Text>
      )}
    </View>
  );

  let empty;
  if (waiting && online) {
    empty = <ActivityIndicator color={colors.palm} style={styles.loading} />;
  } else if (waiting) {
    empty = (
      <View style={styles.empty}>
        <WifiOff color={colors.inkMuted} size={28} />
        <Text style={styles.emptyTitle}>Connect to load your saved homes</Text>
        <Text style={styles.emptyBody}>Homes you&apos;ve opened before will show here offline.</Text>
      </View>
    );
  } else {
    empty = (
      <View style={styles.empty}>
        <Heart color={colors.inkMuted} size={30} />
        <Text style={styles.emptyTitle}>No saved homes yet</Text>
        <Text style={styles.emptyBody}>Tap the heart on any home to keep it here.</Text>
        <Button label="Start searching" onPress={() => router.navigate("/")} />
      </View>
    );
  }

  const footer =
    recent.length > 0 ? (
      <View style={styles.recent}>
        <Text style={styles.sectionTitle}>Recently viewed</Text>
        {recent.map((l) => (
          <PropertyCard key={l.id} listing={l} />
        ))}
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={saved.listings}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <PropertyCard listing={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={saved.isRefetching} onRefresh={refresh} tintColor={colors.palm} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 6, marginBottom: 16 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 4 },
  count: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  hint: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  link: { fontFamily: fonts.sansSemi, color: colors.palm },
  gap: { height: 14 },
  loading: { marginTop: 40 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 12 },
  emptyTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink, textAlign: "center" },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, textAlign: "center", marginBottom: 6 },
  recent: { gap: 14, marginTop: 28 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
});
