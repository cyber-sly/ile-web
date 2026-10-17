import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchPeople } from "@shared/people.js";
import { supabase } from "@/lib/supabase";
import { fetchMyStays, fetchReviewedStayIds, fetchStayRequests, lagosToday, sortStays, type StayRow } from "@/lib/stays";
import StayCard from "@/components/StayCard";
import { colors, fonts } from "@/theme";

type People = Record<string, { name: string; avatar: string | null }>;

// Stay bookings: requests on the host's listings, or the guest's own stays.
// Renders nothing until there is at least one.
export default function StayList({ role, userId, listingIds = [] }: { role: "host" | "guest"; userId: string; listingIds?: string[] }) {
  const ids = listingIds.join(",");
  const stays = useQuery({
    queryKey: [role === "host" ? "stay-requests" : "stays", userId, ids],
    queryFn: async () => {
      const list: StayRow[] = role === "host" ? await fetchStayRequests(ids ? ids.split(",") : []) : await fetchMyStays(userId);
      const others = role === "host" ? list.map((s) => s.guest_id) : list.map((s) => s.listings?.landlord_id).filter(Boolean);
      const [people, reviewed] = await Promise.all([
        fetchPeople(supabase, others) as Promise<People>,
        fetchReviewedStayIds(list.map((s) => String(s.id)), userId),
      ]);
      return { list, people, reviewed: [...reviewed] };
    },
    enabled: Boolean(userId) && (role === "guest" || ids.length > 0),
  });

  const data = stays.data;
  if (!data || data.list.length === 0) return null;
  const reviewed = new Set(data.reviewed);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{role === "host" ? "Stay requests" : "Your stays"}</Text>
      {(sortStays(data.list, lagosToday()) as StayRow[]).map((s) => (
        <StayCard
          key={s.id}
          stay={s}
          role={role}
          personName={data.people[role === "host" ? s.guest_id : s.listings?.landlord_id]?.name}
          reviewed={reviewed.has(String(s.id))}
          onChanged={() => stays.refetch()}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginTop: 8 },
});
