import { useState } from "react";
import { fetchReviewedIds } from "@/lib/reviews";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronRight, Home as HomeIcon, Plus, WifiOff } from "lucide-react-native";
import { deleteListing, fetchMyListings, fetchRequests, updateListing } from "@shared/lister.js";
import { sortViewings, updateViewing, ACTIVE_STATUSES } from "@shared/viewings.js";
import { fetchPeople, fetchRatings, fetchTenantDetails } from "@shared/people.js";
import { isAvailable, isExpired } from "@shared/property.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import RequestCard, { type RequestRow } from "@/components/dashboard/RequestCard";
import ListingRow, { type ListingRowData } from "@/components/dashboard/ListingRow";
import CounterSheet from "@/components/dashboard/CounterSheet";
import ShareStats from "@/components/dashboard/ShareStats";
import BoostSheet from "@/components/dashboard/BoostSheet";
import ShareSheet from "@/components/ShareSheet";
import { useReferralSummary } from "@/lib/referrals";
import { Button, EmptyState, PageTitle, RowSkeleton, Skeleton } from "@/components/kit";
import NotificationsCard from "@/components/NotificationsCard";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius, shadows } from "@/theme";
import Tap from "@/components/kit/Tap";

type DashboardData = {
  listings: ListingRowData[];
  requests: RequestRow[];
  people: Record<string, { name: string; avatar: string | null }>;
  tenantInfo: Record<string, { occupation?: string | null; move_in_timeline?: string | null }>;
  ratings: Record<string, { average: number; total: number }>;
  myBookings: number;
};

async function fetchDashboard(userId: string): Promise<DashboardData> {
  const listings = await fetchMyListings(supabase, userId);
  const requests = await fetchRequests(supabase, listings.map((l: ListingRowData) => l.id));
  const tenantIds = requests.map((r: RequestRow) => r.tenant_id);
  const [people, tenantInfo, ratings, { count }] = await Promise.all([
    fetchPeople(supabase, tenantIds),
    fetchTenantDetails(supabase, tenantIds),
    fetchRatings(supabase, tenantIds, "tenant"),
    // Bookings this account booked on other people's properties.
    supabase.from("inspections").select("id", { count: "exact", head: true }).eq("tenant_id", userId).in("status", ACTIVE_STATUSES),
  ]);
  return { listings, requests, people, tenantInfo, ratings, myBookings: count || 0 };
}

// The lister's home in the app: requests to answer, then their listings.
export default function Dashboard() {
  const { user } = useSession();
  const online = useOnline();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const key = ["dashboard", userId];
  const dashboard = useQuery({ queryKey: key, queryFn: () => fetchDashboard(userId), enabled: Boolean(userId) });
  const [countering, setCountering] = useState<RequestRow | null>(null);
  const [sharing, setSharing] = useState<ListingRowData | null>(null);
  const [boosting, setBoosting] = useState<ListingRowData | null>(null);
  const summary = useReferralSummary(userId);
  const requestIds = (dashboard.data?.requests || []).map((r) => String(r.id));
  const reviewed = useQuery({
    queryKey: ["reviewed", userId, requestIds.join(",")],
    queryFn: () => fetchReviewedIds(supabase, requestIds),
    enabled: Boolean(userId) && requestIds.length > 0,
  });

  function patch(update: (d: DashboardData) => DashboardData) {
    queryClient.setQueryData<DashboardData>(key, (d) => (d ? update(d) : d));
  }

  async function updateRequest(r: RequestRow, changes: Record<string, string | null>) {
    await updateViewing(supabase, r.id, changes);
    patch((d) => ({ ...d, requests: d.requests.map((x) => (x.id === r.id ? { ...x, ...changes } : x)) }));
  }

  async function changeListing(l: ListingRowData, changes: Record<string, string>) {
    await updateListing(supabase, l.id, changes);
    patch((d) => ({ ...d, listings: d.listings.map((x) => (x.id === l.id ? { ...x, ...changes } : x)) }));
    queryClient.invalidateQueries({ queryKey: ["listing", String(l.id)] });
  }

  async function removeListing(l: ListingRowData) {
    await deleteListing(supabase, l.id);
    patch((d) => ({ ...d, listings: d.listings.filter((x) => x.id !== l.id) }));
  }

  const d = dashboard.data;
  const requests = sortViewings(d?.requests || []) as RequestRow[];
  const open = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const history = requests.filter((r) => !ACTIVE_STATUSES.includes(r.status)).slice(0, 10);
  const tiles = [
    { label: "Live listings", value: (d?.listings || []).filter((l) => isAvailable(l) && !isExpired(l)).length },
    { label: "Awaiting reply", value: requests.filter((r) => r.status === "pending").length },
    { label: "Confirmed", value: requests.filter((r) => r.status === "confirmed").length },
  ];

  const card = (r: RequestRow) => (
    <RequestCard
      key={r.id}
      request={r}
      person={d?.people[r.tenant_id] || null}
      details={d?.tenantInfo[r.tenant_id] || null}
      rating={d?.ratings[r.tenant_id] || null}
      online={online}
      onUpdate={(changes) => updateRequest(r, changes)}
      onCounter={() => setCountering(r)}
      reviewed={reviewed.data}
      onReviewed={() => reviewed.refetch()}
    />
  );

  let body;
  if (dashboard.isPending && !online) {
    body = <EmptyState icon={WifiOff} title="Connect to load your dashboard" />;
  } else if (dashboard.isPending) {
    body = (
      <>
        <View style={styles.tiles}>
          <View style={styles.flex1}>
            <Skeleton height={70} rounded={radius.card} />
          </View>
          <View style={styles.flex1}>
            <Skeleton height={70} rounded={radius.card} />
          </View>
          <View style={styles.flex1}>
            <Skeleton height={70} rounded={radius.card} />
          </View>
        </View>
        <RowSkeleton />
        <RowSkeleton />
      </>
    );
  } else if (dashboard.isError) {
    body = (
      <EmptyState
        icon={WifiOff}
        tone="clay"
        title="Couldn't load your dashboard"
        action={<Button label="Try again" variant="secondary" full={false} onPress={() => dashboard.refetch()} />}
      />
    );
  } else {
    body = (
      <>
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <View key={t.label} style={styles.tile}>
              <Text style={styles.tileValue}>{t.value}</Text>
              <Text style={styles.tileLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        {(d?.myBookings || 0) > 0 && (
          <Tap accessibilityRole="button" onPress={() => router.push("/my-viewings")} style={styles.linkRow}>
            <Text style={styles.linkText}>Your bookings on other listings ({d?.myBookings})</Text>
            <ChevronRight color={colors.palm} size={18} />
          </Tap>
        )}

        <Text style={styles.section}>Booking requests</Text>
        {open.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No requests yet">
            When someone makes a booking on one of your listings, it shows up here.
          </EmptyState>
        ) : (
          open.map(card)
        )}

        <Text style={styles.section}>My listings</Text>
        {(d?.listings || []).length === 0 ? (
          <EmptyState
            icon={HomeIcon}
            title="No listings yet"
            action={<Button label="List a property" full={false} onPress={() => router.push("/list/new")} />}
          >
            It&apos;s free and takes about five minutes.
          </EmptyState>
        ) : (
          (d?.listings || []).map((l) => (
            <ListingRow
              key={l.id}
              listing={l}
              online={online}
              onUpdate={(c) => changeListing(l, c)}
              onDelete={() => removeListing(l)}
              onShare={() => setSharing(l)}
              onBoost={summary.data ? () => setBoosting(l) : undefined}
            />
          ))
        )}

        {history.length > 0 && (
          <>
            <Text style={styles.section}>Past requests</Text>
            {history.map(card)}
          </>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={dashboard.isRefetching} onRefresh={() => dashboard.refetch()} tintColor={colors.palm} />}
      >
        <View style={styles.header}>
          <PageTitle>Dashboard</PageTitle>
          <Button label="List a property" size="sm" full={false} icon={Plus} onPress={() => router.push("/list/new")} />
        </View>
        <NotificationsCard />
        <ShareStats summary={summary.data ?? null} />
        {body}
      </ScrollView>
      {sharing && <ShareSheet listing={sharing} code={summary.data?.code ?? null} visible onClose={() => setSharing(null)} />}
      <BoostSheet
        key={boosting ? String(boosting.id) : "none"}
        listing={boosting ? { id: String(boosting.id), title: String(boosting.title) } : null}
        balance={summary.data?.balance ?? 0}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: key });
          summary.refetch();
        }}
        onClose={() => setBoosting(null)}
      />
      <CounterSheet
        visible={countering !== null}
        onClose={() => setCountering(null)}
        onSend={async (changes) => {
          if (countering) await updateRequest(countering, changes);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4 },
  dim: { opacity: 0.5 },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...shadows.card },
  flex1: { flex: 1 },
  tileValue: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  tileLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: radius.control, backgroundColor: colors.palmSoft },
  linkText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  section: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 12 },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
});
