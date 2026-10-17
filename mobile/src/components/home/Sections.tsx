import { FlatList, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { ArrowRight, CalendarCheck, Eye, Home as HomeIcon, KeyRound, Search, ShieldCheck, Wallet, WifiOff } from "lucide-react-native";
import PropertyCard, { type ListingRow } from "@/components/PropertyCard";
import { Button, CardSkeleton, EmptyState, SectionHeading, Shade } from "@/components/kit";
import { HOME_CATEGORIES, HOME_PROMISES, HOME_STEPS, freshSectionState } from "@/lib/ui/home";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";

const PROMISE_ICONS = [Wallet, ShieldCheck, Eye];
const STEP_ICONS = [Search, CalendarCheck, KeyRound];
const CARD_WIDTH = 260;

// "Free to search, save and book" · "Listings from all 36 states and Abuja" · "Prices shown upfront".
export function Promises() {
  return (
    <View style={styles.promises}>
      {HOME_PROMISES.map((text, i) => {
        const Icon = PROMISE_ICONS[i];
        return (
          <View key={text} style={styles.promise}>
            <View style={styles.dot}>
              <Icon size={19} color={colors.palm} />
            </View>
            <Text style={styles.promiseText}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

// "Fresh on Ile": the newest listings, sideways.
export function FreshListings({
  listings,
  isPending,
  online,
  onSeeAll,
  onListFirst,
  isError = false,
  onRetry,
}: {
  listings: ListingRow[];
  isPending: boolean;
  isError?: boolean;
  onRetry: () => void;
  online: boolean;
  onSeeAll: () => void;
  onListFirst: () => void;
}) {
  const state = freshSectionState({ isPending, online, count: listings.length, isError });
  return (
    <View style={styles.section}>
      <View style={styles.pad}>
        <SectionHeading title="Fresh on Ile" subtitle="The newest homes and property listed across Nigeria." action={{ label: "See all", onPress: onSeeAll }} />
      </View>
      {state === "list" && (
        <FlatList
          horizontal
          data={listings}
          keyExtractor={(l) => String(l.id)}
          renderItem={({ item }) => <PropertyCard listing={item} width={CARD_WIDTH} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          ItemSeparatorComponent={Gap}
        />
      )}
      {state === "loading" && (
        <View style={[styles.row, styles.skeletons]}>
          <CardSkeleton width={CARD_WIDTH} />
          <CardSkeleton width={CARD_WIDTH} />
        </View>
      )}
      {state === "offline" && (
        <View style={[styles.pad, styles.offline]}>
          <WifiOff size={16} color={colors.inkMuted} />
          <Text style={styles.muted}>Connect to see the newest listings.</Text>
        </View>
      )}
      {state === "error" && (
        <View style={[styles.pad, styles.offline]}>
          <WifiOff size={16} color={colors.inkMuted} />
          <Text style={[styles.muted, styles.flex1]}>Couldn&apos;t load the newest listings.</Text>
          <Button label="Try again" variant="secondary" size="sm" full={false} onPress={onRetry} />
        </View>
      )}
      {state === "empty" && (
        <View style={styles.pad}>
          <EmptyState icon={HomeIcon} title="No listings yet" action={<Button label="List the first property" full={false} onPress={onListFirst} />}>
            Be the first to list a property on Ile. It&apos;s free.
          </EmptyState>
        </View>
      )}
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

// "What are you looking for?": four photo tiles.
export function Categories({ onPick }: { onPick: (tab: string) => void }) {
  return (
    <View style={[styles.section, styles.pad]}>
      <SectionHeading title="What are you looking for?" />
      <View style={styles.grid}>
        {HOME_CATEGORIES.map((c) => (
          <Tap key={c.tab} accessibilityRole="button" accessibilityLabel={c.title} onPress={() => onPick(c.tab)} style={styles.tile}>
            <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" alt="" />
            <Shade colors={["transparent", "rgba(14,21,38,0.3)", "rgba(14,21,38,0.85)"]} />
            <View style={styles.tileText}>
              <Text style={styles.tileTitle}>{c.title}</Text>
              <Text style={styles.tileBlurb} numberOfLines={2}>
                {c.blurb}
              </Text>
              <View style={styles.browse}>
                <Text style={styles.browseText}>Browse</Text>
                <ArrowRight size={14} color={colors.white} />
              </View>
            </View>
          </Tap>
        ))}
      </View>
    </View>
  );
}

// "How Ile works": three steps.
export function HowItWorks() {
  return (
    <View style={[styles.section, styles.pad]}>
      <View style={styles.how}>
        <Text style={styles.howTitle}>How Ile works</Text>
        {HOME_STEPS.map((s, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepIcon}>
                <Icon size={20} color={colors.white} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepNo}>Step {i + 1}</Text>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.muted}>{s.body}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// "For owners and agents": the dark panel at the bottom.
export function OwnersPanel({ onList }: { onList: () => void }) {
  return (
    <View style={[styles.section, styles.pad, styles.last]}>
      <View style={styles.owners}>
        <Text style={styles.eyebrow}>For owners and agents</Text>
        <Text style={styles.ownersTitle}>Have a property to let or sell?</Text>
        <Text style={styles.ownersBody}>
          List it free in a few minutes. Serious home-seekers make bookings straight from your listing, and you manage every request in one dashboard.
        </Text>
        <View style={styles.ownersButton}>
          <Button label="List your property free" variant="onDark" full={false} icon={ArrowRight} iconRight onPress={onList} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16 },
  section: { marginTop: 32 },
  last: { marginBottom: 40 },
  promises: { paddingHorizontal: 16, marginTop: 24, gap: 12 },
  promise: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  promiseText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.ink },
  row: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  skeletons: { flexDirection: "row", gap: 14 },
  gap: { width: 14 },
  offline: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 16 },
  flex1: { flex: 1 },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  tile: { width: "48%", flexGrow: 1, height: 190, borderRadius: radius.hero, overflow: "hidden", backgroundColor: colors.ink },
  tileText: { position: "absolute", left: 14, right: 12, bottom: 14, gap: 4 },
  tileTitle: { fontFamily: fonts.serif, fontSize: 19, color: colors.white },
  tileBlurb: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: "rgba(255,255,255,0.85)" },
  browse: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  browseText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.white },
  how: { padding: 22, borderRadius: radius.hero, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 18 },
  howTitle: { fontFamily: fonts.serif, fontSize: 26, color: colors.ink },
  step: { flexDirection: "row", gap: 14 },
  stepIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.palm },
  stepText: { flex: 1, gap: 2 },
  stepNo: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.inkMuted },
  stepTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink },
  owners: { padding: 24, borderRadius: radius.hero, backgroundColor: colors.palmDark, gap: 10 },
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: colors.gold },
  ownersTitle: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 33, color: colors.white },
  ownersBody: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.8)" },
  ownersButton: { marginTop: 10 },
});
