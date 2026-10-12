import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { fetchReviewedIds } from "@/lib/reviews";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX, WifiOff } from "lucide-react-native";
import { acceptChanges, fetchMyViewings, sortViewings, updateViewing } from "@shared/viewings.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import NotificationsCard from "@/components/NotificationsCard";
import ViewingCard, { type ViewingRow } from "@/components/ViewingCard";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts } from "@/theme";

function Gap() {
  return <View style={styles.gap} />;
}

// A home-seeker's viewings (also used by listers for viewings they booked).
export default function MyViewings() {
  const { user } = useSession();
  const online = useOnline();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const viewings = useQuery({
    queryKey: ["viewings", userId],
    queryFn: () => fetchMyViewings(supabase, userId) as Promise<ViewingRow[]>,
    enabled: Boolean(userId),
  });

  const ids = (viewings.data || []).map((v) => String(v.id));
  const reviewed = useQuery({
    queryKey: ["reviewed", userId, ids.join(",")],
    queryFn: () => fetchReviewedIds(supabase, ids),
    enabled: Boolean(userId) && ids.length > 0,
  });

  async function update(v: ViewingRow, changes: Record<string, string>) {
    await updateViewing(supabase, v.id, changes);
    queryClient.setQueryData<ViewingRow[]>(["viewings", userId], (list) => (list || []).map((x) => (x.id === v.id ? { ...x, ...changes } : x)));
    queryClient.invalidateQueries({ queryKey: ["active-viewing"] });
  }

  if (!user) {
    return (
      <Screen title="My viewings" subtitle="Viewings you book on Ile are listed here.">
        <Button label="Log in to see your viewings" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  const list = sortViewings(viewings.data || []) as ViewingRow[];

  let empty;
  if (viewings.isPending && !online) {
    empty = (
      <View style={styles.empty}>
        <WifiOff color={colors.inkMuted} size={28} />
        <Text style={styles.emptyTitle}>Connect to load your viewings</Text>
      </View>
    );
  } else if (viewings.isPending) {
    empty = <ActivityIndicator color={colors.palm} style={styles.loading} />;
  } else if (viewings.isError) {
    empty = (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Couldn&apos;t load your viewings</Text>
        <Button label="Try again" variant="secondary" onPress={() => viewings.refetch()} />
      </View>
    );
  } else {
    empty = (
      <View style={styles.empty}>
        <CalendarX color={colors.inkMuted} size={30} />
        <Text style={styles.emptyTitle}>No viewings booked yet</Text>
        <Text style={styles.emptyBody}>Book a free viewing from any listing.</Text>
        <Button label="Find a place to view" onPress={() => router.navigate("/search")} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={list}
        keyExtractor={(v) => String(v.id)}
        renderItem={({ item }) => (
          <ViewingCard
            viewing={item}
            online={online}
            onAccept={(v) => update(v, acceptChanges(v))}
            onUpdate={update}
            reviewed={reviewed.data}
            onReviewed={() => reviewed.refetch()}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>My viewings</Text>
            <Text style={styles.subtitle}>Track the viewings you&apos;ve requested and respond to new times.</Text>
            <NotificationsCard />
          </View>
        }
        ListEmptyComponent={empty}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={viewings.isRefetching} onRefresh={() => viewings.refetch()} tintColor={colors.palm} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 6, marginBottom: 16 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 4 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  gap: { height: 14 },
  loading: { marginTop: 40 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 12 },
  emptyTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink, textAlign: "center" },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, textAlign: "center", marginBottom: 6 },
});
