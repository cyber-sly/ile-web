import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import { SEARCH_TABS } from "@shared/search.js";
import { Em } from "@/components/kit";
import { colors, fonts, radius, shadows } from "@/theme";

// The website's hero (HomeHero.jsx): photo, headline, and the search box
// floating over the bottom edge of the photo.
export default function Hero({ onSearch }: { onSearch: (tab: string, q: string) => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("rent");
  const [q, setQ] = useState("");

  return (
    <View>
      <View style={[styles.photoBox, { marginTop: insets.top + 6 }]}>
        <Image source={require("@/assets/images/hero.jpg")} style={StyleSheet.absoluteFill} contentFit="cover" alt="" />
        <LinearGradient
          colors={["rgba(15,28,21,0.2)", "rgba(15,28,21,0.35)", "rgba(15,28,21,0.8)"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.logo}>Ile</Text>
        <View style={styles.copy}>
          <Text style={styles.h1} accessibilityRole="header">
            Find your place in Nigeria, <Em>without the wahala.</Em>
          </Text>
          <Text style={styles.lead}>Homes, land and shops to rent or buy, from Lagos to Kano. Free to search, free to view. No inspection fees.</Text>
        </View>
      </View>

      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {(SEARCH_TABS as { value: string; label: string }[]).map((t) => {
            const on = t.value === tab;
            return (
              <Pressable key={t.value} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setTab(t.value)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.row}>
          <View style={styles.inputWrap}>
            <Search size={17} color={colors.inkMuted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Area, LGA or state"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={() => onSearch(tab, q.trim())}
              accessibilityLabel="Search by area, LGA or state"
            />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={() => onSearch(tab, q.trim())} style={styles.go}>
            <Text style={styles.goText}>Search</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoBox: { marginHorizontal: 12, height: 330, borderRadius: radius.hero, overflow: "hidden", backgroundColor: colors.ink },
  logo: { position: "absolute", top: 16, left: 18, fontFamily: fonts.serif, fontSize: 24, color: colors.white },
  copy: { position: "absolute", left: 20, right: 20, bottom: 64, gap: 10 },
  h1: { fontFamily: fonts.serifMedium, fontSize: 34, lineHeight: 37, color: colors.white },
  lead: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, color: "rgba(255,255,255,0.9)" },
  card: { marginTop: -44, marginHorizontal: 24, padding: 12, gap: 10, borderRadius: radius.card, backgroundColor: colors.surface, ...shadows.float },
  tabs: { gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.cream },
  tabOn: { backgroundColor: colors.palm },
  tabText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  tabTextOn: { color: colors.white },
  row: { flexDirection: "row", gap: 8 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  input: { flex: 1, minHeight: 44, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  go: { justifyContent: "center", paddingHorizontal: 16, borderRadius: radius.control, backgroundColor: colors.palm },
  goText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.white },
});
