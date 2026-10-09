import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, WifiOff } from "lucide-react-native";
import { buildQuery, PAGE_SIZE, SEARCH_TABS } from "@shared/search.js";
import { pluralize } from "@shared/format.js";
import { supabase } from "@/lib/supabase";
import { activeFilterCount, DEFAULT_FILTERS, useFilters, type Filters } from "@/lib/filters";
import { useSearchText } from "@/lib/useSearchText";
import Chip from "@/components/Chip";
import Button from "@/components/Button";
import PropertyCard, { type ListingRow } from "@/components/PropertyCard";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";

type Page = { rows: ListingRow[]; count: number };

async function fetchPage(filters: Filters, page: number): Promise<Page> {
  const { data, count, error } = await buildQuery(supabase, filters, page);
  if (error) throw new Error(error.message);
  return { rows: data || [], count: count || 0 };
}

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
  const heading = SEARCH_TABS.find((t: { value: string }) => t.value === filters.tab)?.heading;

  function clearFilters() {
    setText("");
    change({ ...DEFAULT_FILTERS, tab: filters.tab });
  }

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Find your place</Text>
      <View style={styles.searchBox}>
        <Search color={colors.inkMuted} size={18} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Area, LGA or state"
          placeholderTextColor={colors.inkMuted}
          style={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search by area, LGA or state"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {SEARCH_TABS.map((t: { value: string; label: string }) => (
          <Chip key={t.value} label={t.label} selected={filters.tab === t.value} onPress={() => change({ tab: t.value })} />
        ))}
      </ScrollView>
      <View style={styles.row}>
        <Text style={styles.count}>
          {results.data ? `${pluralize(total, "result")} · ${heading}` : heading}
        </Text>
        <Pressable
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
        </Pressable>
      </View>
    </View>
  );

  let empty = null;
  if (results.isPending && !online) {
    empty = (
      <View style={styles.empty}>
        <WifiOff color={colors.inkMuted} size={28} />
        <Text style={styles.emptyTitle}>Search needs a connection</Text>
        <Text style={styles.emptyBody}>Your saved and recently viewed homes still work offline.</Text>
      </View>
    );
  } else if (results.isPending) {
    empty = <ActivityIndicator color={colors.palm} style={styles.loading} />;
  } else if (results.isError) {
    empty = (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Couldn&apos;t load homes</Text>
        <Button label="Try again" variant="secondary" onPress={() => results.refetch()} />
      </View>
    );
  } else {
    empty = (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No homes match these filters</Text>
        <Text style={styles.emptyBody}>Try another area or fewer filters.</Text>
        {(filterCount > 0 || filters.q) && <Button label="Clear filters" variant="secondary" onPress={clearFilters} />}
      </View>
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
        ItemSeparatorComponent={() => <View style={styles.gap} />}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 14, marginBottom: 16 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 4 },
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
  tabs: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  count: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
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
  gap: { height: 14 },
  loading: { marginTop: 40 },
  more: { marginVertical: 20 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 12 },
  emptyTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink, textAlign: "center" },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, textAlign: "center" },
});
