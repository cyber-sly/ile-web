import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, Plus, Search } from "lucide-react-native";
import { SEARCH_TABS } from "@shared/search.js";
import { Button, Em, Logo } from "@/components/kit";
import { colors, fonts, radius, shadows } from "@/theme";

// The website's top bar and hero (Navbar + HomeHero + SearchBox): photo,
// headline, and the search box floating over the bottom edge of the photo.
export default function Hero({ onSearch, onList }: { onSearch: (tab: string, q: string) => void; onList: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("rent");
  const [q, setQ] = useState("");

  return (
    <View>
      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <Logo />
        <Button label="List property" variant="secondary" size="sm" full={false} pill icon={Plus} onPress={onList} />
      </View>

      <View style={styles.photoBox}>
        <Image source={require("@/assets/images/hero.jpg")} style={StyleSheet.absoluteFill} contentFit="cover" alt="" />
        <LinearGradient
          colors={["rgba(15,28,21,0.2)", "rgba(15,28,21,0.35)", "rgba(15,28,21,0.8)"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.h1} accessibilityRole="header">
          Find your place in Nigeria, <Em>without the wahala.</Em>
        </Text>
        <Text style={styles.lead}>Homes, land and shops to rent or buy, from Lagos to Kano. Free to search, free to view. No inspection fees.</Text>
      </View>

      <View style={styles.card} accessibilityRole="search">
        <View style={styles.tabs} accessibilityRole="tablist">
          {(SEARCH_TABS as { value: string; label: string }[]).map((t) => {
            const on = t.value === tab;
            return (
              <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t.value)} style={[styles.tab, on && styles.tabOn]}>
                <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <MapPin size={18} color={colors.palm} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="State, LGA or area, e.g. Lekki, Wuse, Bodija"
              placeholderTextColor={colors.inkMuted}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={() => onSearch(tab, q.trim())}
              accessibilityLabel="Location"
            />
          </View>
          <Button label="Search" icon={Search} onPress={() => onSearch(tab, q.trim())} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  photoBox: {
    marginHorizontal: 12,
    paddingHorizontal: 20,
    paddingTop: 112,
    paddingBottom: 96,
    gap: 16,
    borderRadius: radius.hero,
    overflow: "hidden",
    backgroundColor: colors.ink,
  },
  h1: { fontFamily: fonts.serifMedium, fontSize: 41, lineHeight: 43, letterSpacing: -1, color: colors.white },
  lead: { fontFamily: fonts.sans, fontSize: 18, lineHeight: 27, color: "rgba(255,255,255,0.9)" },
  card: {
    marginTop: -56,
    marginHorizontal: 24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    ...shadows.float,
  },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },
  tabOn: { borderBottomWidth: 2, borderBottomColor: colors.palm, marginBottom: -1 },
  tabText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.inkMuted },
  tabTextOn: { color: colors.palm },
  form: { padding: 10, gap: 8 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, height: 48, fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
});
