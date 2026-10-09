import { ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { fetchListing } from "@/lib/listing";
import ListingWizard from "@/components/wizard/ListingWizard";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import { useOnline } from "@/components/OfflineBanner";
import { colors } from "@/theme";

// Edit a listing with the same wizard. Only the lister who posted it can.
export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const online = useOnline();
  const listing = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(supabase, id), staleTime: 0 });

  if (listing.isPending && !online) {
    return <Screen title="Connect to load this listing" subtitle="Open it once while online and you can edit it offline after that." />;
  }
  if (listing.isPending) return <ActivityIndicator color={colors.palm} style={{ marginTop: 40 }} />;
  if (listing.isError && !listing.data) {
    return (
      <Screen title="Couldn't load this listing" subtitle="Check your connection and try again.">
        <Button label="Try again" onPress={() => listing.refetch()} />
      </Screen>
    );
  }

  if (!listing.data || !user || listing.data.landlord_id !== user.id) {
    return (
      <Screen title="You can only edit your own listings" subtitle="Log in with the account that posted this listing.">
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <ListingWizard listing={listing.data} />;
}
