import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react-native";
import { fetchPeople, fetchRatings, fetchResponseTimes } from "@shared/people.js";
import { formatResponseTime } from "@shared/profileDisplay.js";
import { listerLabel } from "@shared/property.js";
import { supabase } from "@/lib/supabase";
import type { ListingRow } from "@/components/PropertyCard";
import { colors, fonts } from "@/theme";

async function fetchLister(id: string) {
  const [people, ratings, replies] = await Promise.all([
    fetchPeople(supabase, [id]),
    fetchRatings(supabase, [id], "lister"),
    fetchResponseTimes(supabase, [id]),
  ]);
  return { person: people[id] || null, rating: ratings[id] || null, reply: formatResponseTime(replies[id]) as string | null };
}

// "Listed by Adeyemi Homes · Agent", with rating and reply time.
export default function ListerLine({ listing }: { listing: ListingRow }) {
  const id = String(listing.landlord_id || "");
  const { data } = useQuery({ queryKey: ["lister", id], queryFn: () => fetchLister(id), enabled: Boolean(id) });
  const role = listing.lister_type ? listerLabel(listing.lister_type) : "Lister";
  const name = data?.person?.name;
  const initial = (name || role).trim().charAt(0).toUpperCase();
  const rating = data?.rating;

  return (
    <View style={styles.row}>
      {data?.person?.avatar ? (
        <Image source={{ uri: data.person.avatar }} style={styles.avatar} cachePolicy="disk" />
      ) : (
        <View style={[styles.avatar, styles.initial]}>
          <Text style={styles.initialText}>{initial}</Text>
        </View>
      )}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name || role}
        </Text>
        <Text style={styles.muted}>{name ? role : "Listed on Ile"}</Text>
        {rating?.total ? (
          <View style={styles.rating}>
            <Star size={13} color={colors.gold} fill={colors.gold} />
            <Text style={styles.ratingText}>
              {Number(rating.average).toFixed(1)}
              <Text style={styles.muted}>
                {" "}
                · {rating.total} review{rating.total === 1 ? "" : "s"}
              </Text>
            </Text>
          </View>
        ) : name ? (
          <Text style={styles.muted}>No reviews yet</Text>
        ) : null}
        {data?.reply ? <Text style={styles.reply}>{data.reply}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.palm },
  text: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkMuted },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  reply: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.palm },
});
