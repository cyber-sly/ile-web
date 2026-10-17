import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, SearchX, SlidersHorizontal, WifiOff, X } from "lucide-react-native";
import { buildQuery, listingsHeading, PAGE_SIZE, SEARCH_TABS } from "@shared/search.js";
import { supabase } from "@/lib/supabase";
import { activeFilterCount, DEFAULT_FILTERS, useFilters, type Filters } from "@/lib/filters";
import { activeFilterChips, chipClears } from "@/lib/ui/filterChips";
import { useSearchText } from "@/lib/useSearchText";
import { Button, CardSkeleton, EmptyState } from "@/components/kit";
import PropertyCard, { type ListingRow } from "@/components/PropertyCard";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";

type Page = { rows: ListingRow[]; count: number };

async function fetchPage(filters: Filters, page: number): Promise<Page> {
  const { data, count, error } = await buildQuery(supabase, filters, page);
  if (error) throw new Error(error.message);
  return { rows: data || [], count: count || 0 };
}

// The website's listings page (ListingsBrowser.jsx), phone layout.
export default function SearchScreen() {
  const [filters, change] = useFilters();
  const online = useOnline();
  const [text, setText] = useSearchText(filters.q, change);

  const results = useInfiniteQuery({
    queryKey: ["search", filters],
    queryFn: ({ pageParam }) => fetchPage(filters, pageParam),
    initialPageParam: 0,
    gcTime: 30 * 60 * 1000, // only the current search is kept across restarts
    getNextPageParam: (last: Page, pages: Page[]) => (last.rows.length === PAGE_SIZE ? pages.length : undefined),
  });

  const rows = results.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = results.data?.pages[0]?.count ?? 0;
  const filterCount = activeFilterCount(filters);
  const chips = activeFilterChips(filters);
  const heading = listingsHeading(filters);

  function clearFilters() {
    setText("");
    change({ ...DEFAULT_FILTERS, tab: filters.tab });
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.back}
        >
          <ArrowLeft color={colors.ink} size={20} />
        </Tap>
        <Text style={[styles.title, styles.flex]} accessibilityRole="header">
          {heading}
        </Text>
      </View>
      <View style={styles.searchBox}>
        <MapPin color={colors.palm} size={18} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search by area, LGA, state or title"
          placeholderTextColor={colors.inkMuted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search by area, LGA or state"
        />
      </View>
      <View style={styles.tabBar} accessibilityRole="tablist">
        {SEARCH_TABS.map((t: { value: string; label: string }) => {
          const on = filters.tab === t.value;
          return (
            <Tap
              key={t.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => change({ tab: t.value })}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
            </Tap>
          );
        })}
      </View>
      <View style={styles.row}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={filterCount ? `Filters, ${filterCount} applied` : "Filters"}
          onPress={() => router.push("/filters")}
          style={styles.filterButton}
        >
          <SlidersHorizontal color={colors.palm} size={16} />
          <Text style={styles.filterText}>Filters</Text>
          {filterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filterCount}</Text>
            </View>
          )}
        </Tap>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.flex}>
          {chips.map((c) => (
            <Tap
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${c.label}`}
              onPress={() => change(chipClears(c.key))}
              style={styles.applied}
            >
              <Text style={styles.appliedText}>{c.label}</Text>
              <X color={colors.palm} size={14} />
            </Tap>
          ))}
        </ScrollView>
      </View>
      {results.data && total > 0 ? (
        <Text style={styles.count}>
          {total.toLocaleString()} {total === 1 ? "property" : "properties"}
        </Text>
      ) : null}
    </View>
  );

  let empty = null;
  if (results.isPending && !online) {
    empty = (
      <EmptyState icon={WifiOff} title="Search needs a connection">
        Your saved and recently viewed homes still work offline.
      </EmptyState>
    );
  } else if (results.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  } else if (results.isError) {
    empty = (
      <EmptyState
        icon={WifiOff}
        tone="clay"
        title="Couldn't load listings"
        action={<Button label="Try again" variant="secondary" full={false} onPress={() => results.refetch()} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={SearchX}
        title="Nothing matches yet"
        action={filterCount > 0 || filters.q ? <Button label="Clear all filters" full={false} onPress={clearFilters} /> : undefined}
      >
        Try another area, widen your budget, or remove a filter.
      </EmptyState>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={rows}
        keyExtractor={(l) => String(l.id)}
        renderItem={({ item }) => <PropertyCard listing={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={results.isFetchingNextPage ? <ActivityIndicator color={colors.palm} style={styles.more} /> : null}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Gap}
        onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
        onEndReachedThreshold={0.6}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={results.isRefetching && !results.isFetchingNextPage} onRefresh={() => results.refetch()} tintColor={colors.palm} />
        }
      />
    </SafeAreaView>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 14, marginBottom: 18 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: colors.ink },
  count: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.inkMuted, marginTop: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  tabBar: { flexDirection: "row", gap: 4, marginHorizontal: -16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.palm, marginBottom: -1 },
  tabText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.inkMuted },
  tabTextOn: { color: colors.palm },
  chips: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.palm,
    backgroundColor: colors.surface,
  },
  filterText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.palm },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.palm, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.white },
  applied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.palmSoft,
  },
  appliedText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.palm },
  skeletons: { gap: 14 },
  gap: { height: 14 },
  more: { marginVertical: 20 },
});
