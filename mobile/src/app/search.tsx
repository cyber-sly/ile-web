import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, Home, Search, SlidersHorizontal, WifiOff, X } from "lucide-react-native";
import { buildQuery, PAGE_SIZE, SEARCH_TABS } from "@shared/search.js";
import { pluralize } from "@shared/format.js";
import { supabase } from "@/lib/supabase";
import { activeFilterCount, DEFAULT_FILTERS, useFilters, type Filters } from "@/lib/filters";
import { activeFilterChips } from "@/lib/ui/filterChips";
import { useSearchText } from "@/lib/useSearchText";
import Chip from "@/components/Chip";
import { Button, CardSkeleton, EmptyState } from "@/components/kit";
import PropertyCard, { type ListingRow } from "@/components/PropertyCard";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts, radius } from "@/theme";

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
  const heading = SEARCH_TABS.find((t: { value: string }) => t.value === filters.tab)?.heading;

  function clearFilters() {
    setText("");
    change({ ...DEFAULT_FILTERS, tab: filters.tab });
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={styles.back}
        >
          <ArrowLeft color={colors.ink} size={20} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">
            {heading}
          </Text>
          {results.data ? <Text style={styles.count}>{pluralize(total, "result")}</Text> : null}
        </View>
      </View>
      <View style={styles.searchBox}>
        <Search color={colors.inkMuted} size={17} />
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
      <View style={styles.row}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={styles.flex}>
          {SEARCH_TABS.map((t: { value: string; label: string }) => (
            <Chip key={t.value} label={t.label} selected={filters.tab === t.value} onPress={() => change({ tab: t.value })} />
          ))}
        </ScrollView>
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
      {chips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {chips.map((c) => (
            <Pressable
              key={c.key}
              accessibilityRole="button"
              accessibilityLabel={`Remove filter ${c.label}`}
              onPress={() => change({ [c.key]: "" })}
              style={styles.applied}
            >
              <Text style={styles.appliedText}>{c.label}</Text>
              <X color={colors.palm} size={14} />
            </Pressable>
          ))}
        </ScrollView>
      )}
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
        title="Couldn't load homes"
        action={<Button label="Try again" variant="secondary" full={false} onPress={() => results.refetch()} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={Home}
        title="No homes match these filters"
        action={filterCount > 0 || filters.q ? <Button label="Clear filters" variant="secondary" full={false} onPress={clearFilters} /> : undefined}
      >
        Try another area or fewer filters.
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
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, color: colors.ink },
  count: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  tabs: { gap: 8 },
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
