import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestListings } from "@shared/search.js";
import { supabase } from "@/lib/supabase";
import { changeFilters, DEFAULT_FILTERS } from "@/lib/filters";
import { useSession } from "@/lib/useSession";
import Hero from "@/components/home/Hero";
import { Categories, FreshListings, HowItWorks, OwnersPanel, Promises } from "@/components/home/Sections";
import { useOnline } from "@/components/OfflineBanner";
import type { ListingRow } from "@/components/PropertyCard";
import { colors } from "@/theme";

// Home: the website's home page, top to bottom.
export default function HomeScreen() {
  const { user } = useSession();
  const online = useOnline();
  const latest = useQuery({ queryKey: ["home-latest"], queryFn: () => fetchLatestListings(supabase) as Promise<ListingRow[]> });

  function openSearch(tab: string, q = "") {
    changeFilters({ ...DEFAULT_FILTERS, tab, q });
    router.push("/search");
  }

  function listProperty() {
    // Anyone can list; logged out, sign up first (as on the website).
    if (user) router.push("/list/new");
    else router.push({ pathname: "/signup", params: { role: "landlord", next: "/list/new" } });
  }

  return (
    <ScrollView
      style={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={latest.isRefetching} onRefresh={() => latest.refetch()} tintColor={colors.palm} />}
    >
      <Hero onSearch={openSearch} onList={listProperty} />
      <Promises />
      <FreshListings
        listings={latest.data || []}
        isPending={latest.isPending}
        isError={latest.isError}
        onRetry={() => latest.refetch()}
        online={online}
        onSeeAll={() => openSearch("rent")}
        onListFirst={listProperty}
      />
      <Categories onPick={(tab) => openSearch(tab)} />
      <HowItWorks />
      <OwnersPanel onList={listProperty} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
});
