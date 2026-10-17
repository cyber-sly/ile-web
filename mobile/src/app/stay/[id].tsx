import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react-native";
import { priceParts } from "@shared/property.js";
import { supabase } from "@/lib/supabase";
import { fetchListing } from "@/lib/listing";
import { lagosToday } from "@/lib/stays";
import { successHaptic } from "@/lib/haptics";
import StayBooking from "@/components/StayBooking";
import { Button } from "@/components/kit";
import { colors, fonts, radius } from "@/theme";

// Booking sheet for a stay: dates, guests and a request to the host.
export default function StaySheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const listing = useQuery({ queryKey: ["listing", id], queryFn: () => fetchListing(supabase, id) });
  const [sent, setSent] = useState(false);

  if (listing.isPending) return <ActivityIndicator color={colors.palm} style={styles.loading} />;
  if (!listing.data) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>This place isn&apos;t available</Text>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const l = listing.data;
  const { amount, suffix } = priceParts(l);

  if (sent) {
    return (
      <View style={styles.page}>
        <View style={styles.done}>
          <CalendarCheck color={colors.palm} size={28} />
          <Text style={styles.title}>Request sent</Text>
          <Text style={styles.muted}>The host will accept or decline. You&apos;ll get a notification, and you can follow it in Bookings.</Text>
        </View>
        <Button label="See my bookings" onPress={() => router.navigate("/viewings")} />
        <Button label="Back to the listing" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} numberOfLines={2}>
        {l.title}
      </Text>
      <Text style={styles.price}>
        {amount}
        <Text style={styles.muted}> {suffix}</Text>
      </Text>
      <StayBooking
        listing={l}
        today={lagosToday()}
        onBooked={() => {
          successHaptic();
          queryClient.invalidateQueries({ queryKey: ["stays"] });
          setSent(true);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  page: { padding: 20, paddingBottom: 48, gap: 14, backgroundColor: colors.surface },
  loading: { marginTop: 60 },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.ink },
  price: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  done: { gap: 10, padding: 18, borderRadius: radius.card, backgroundColor: colors.palmSoft },
});
