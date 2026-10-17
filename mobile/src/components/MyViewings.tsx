import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { fetchReviewedIds } from "@/lib/reviews";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX, WifiOff } from "lucide-react-native";
import { acceptChanges, fetchMyViewings, sortViewings, updateViewing } from "@shared/viewings.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import Screen from "@/components/Screen";
import { Button, EmptyState, PageTitle, RowSkeleton } from "@/components/kit";
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
      <Screen title="My bookings" subtitle="Bookings you make on Ile are listed here.">
        <Button label="Log in to see your bookings" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  const list = sortViewings(viewings.data || []) as ViewingRow[];

  let empty;
  if (viewings.isPending && !online) {
    empty = <EmptyState icon={WifiOff} title="Connect to load your bookings" />;
  } else if (viewings.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </View>
    );
  } else if (viewings.isError) {
    empty = (
      <EmptyState
        icon={WifiOff}
        tone="clay"
        title="Couldn't load your bookings"
        action={<Button label="Try again" variant="secondary" full={false} onPress={() => viewings.refetch()} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={CalendarX}
        title="No bookings yet"
        action={<Button label="Find a place to view" full={false} onPress={() => router.navigate("/search")} />}
      >
        Fix a booking from any listing page.
      </EmptyState>
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
            <PageTitle>My bookings</PageTitle>
            <Text style={styles.subtitle}>Track the bookings you&apos;ve requested and respond to new times.</Text>
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
  subtitle: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  gap: { height: 14 },
  skeletons: { gap: 12 },
});
