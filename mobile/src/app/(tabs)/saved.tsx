import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
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
import { Button, CardSkeleton, EmptyState, PageTitle } from "@/components/kit";
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
      <PageTitle>Saved homes</PageTitle>
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
    empty = (
      <View style={styles.skeletons}>
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  } else if (waiting) {
    empty = (
      <EmptyState icon={WifiOff} title="Connect to load your saved homes">
        Homes you&apos;ve opened before will show here offline.
      </EmptyState>
    );
  } else {
    empty = (
      <EmptyState
        icon={Heart}
        title="Nothing saved yet"
        action={<Button label="Start browsing" full={false} onPress={() => router.navigate("/search")} />}
      >
        Save the places you like so you can compare them and book viewings later.
      </EmptyState>
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
  count: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  hint: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  link: { fontFamily: fonts.sansSemi, color: colors.palm },
  gap: { height: 14 },
  skeletons: { gap: 14 },
  recent: { gap: 14, marginTop: 28 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
});
