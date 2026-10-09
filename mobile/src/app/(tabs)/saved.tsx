import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { Heart } from "lucide-react-native";
import { pluralize } from "@shared/format.js";
import { useSavedListings } from "@/lib/savedListings";
import { useSession } from "@/lib/useSession";
import PropertyCard from "@/components/PropertyCard";
import Button from "@/components/Button";
import { colors, fonts } from "@/theme";

// Saved homes, synced with the website when logged in, and available offline.
export default function SavedScreen() {
  const { user } = useSession();
  const saved = useSavedListings();
  const loading = saved.ids.length > 0 && saved.isPending;

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

  const empty = loading ? (
    <ActivityIndicator color={colors.palm} style={styles.loading} />
  ) : (
    <View style={styles.empty}>
      <Heart color={colors.inkMuted} size={30} />
      <Text style={styles.emptyTitle}>No saved homes yet</Text>
      <Text style={styles.emptyBody}>Tap the heart on any home to keep it here.</Text>
      <Button label="Start searching" onPress={() => router.navigate("/")} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={saved.listings}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <PropertyCard listing={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={saved.isRefetching} onRefresh={() => saved.refetch()} tintColor={colors.palm} />}
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
  emptyTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, textAlign: "center", marginBottom: 6 },
});
