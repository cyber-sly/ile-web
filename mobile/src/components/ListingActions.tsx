import { useState } from "react";
import { friendlyError } from "@shared/errors.js";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarClock, CalendarDays, MessageCircle, Pencil } from "lucide-react-native";
import { listingActions } from "@shared/lister.js";
import { useSession } from "@/lib/useSession";
import { openChat } from "@/lib/messagingApp";
import { listingState } from "@/lib/listing";
import { useOnline } from "@/components/OfflineBanner";
import type { ListingRow } from "@/components/PropertyCard";
import { colors, fonts, radius } from "@/theme";

// Sticky bar on the listing screen: book a viewing or message the lister.
// The lister sees "Edit listing" and "Viewing times" on their own listing.
export default function ListingActions({ listing }: { listing: ListingRow }) {
  const { user } = useSession();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  if (user && user.id === listing.landlord_id) {
    const actions = listingActions(listing);
    if (!actions.edit) return null;
    return (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Viewing times"
            onPress={() => router.push({ pathname: "/list/[id]/times", params: { id: String(listing.id) } })}
            style={[styles.button, styles.secondary]}
          >
            <CalendarClock color={colors.palm} size={18} />
            <Text style={[styles.label, styles.secondaryLabel]}>Viewing times</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit listing"
            onPress={() => router.push({ pathname: "/list/[id]/edit", params: { id: String(listing.id) } })}
            style={[styles.button, styles.primary]}
          >
            <Pencil color={colors.white} size={18} />
            <Text style={[styles.label, styles.primaryLabel]}>Edit listing</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (listingState(listing) !== "available") return null;

  function book() {
    if (!user) return router.push("/login");
    router.push({ pathname: "/book/[id]", params: { id: String(listing.id) } });
  }

  async function message() {
    if (!user) return router.push("/login");
    setOpening(true);
    setError("");
    try {
      await openChat(String(listing.id));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {!online && <Text style={styles.note}>Booking and messages need a connection.</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Message the lister"
          disabled={!online || opening}
          onPress={message}
          style={[styles.button, styles.secondary, (!online || opening) && styles.dim]}
        >
          <MessageCircle color={colors.palm} size={18} />
          <Text style={[styles.label, styles.secondaryLabel]}>{opening ? "Opening…" : "Message"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Book a viewing"
          disabled={!online}
          onPress={book}
          style={[styles.button, styles.primary, !online && styles.dim]}
        >
          <CalendarDays color={colors.white} size={18} />
          <Text style={[styles.label, styles.primaryLabel]}>Book a viewing</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 8, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  row: { flexDirection: "row", gap: 10 },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 50, borderRadius: radius.control },
  primary: { flex: 1.4, backgroundColor: colors.palm },
  secondary: { flex: 1, borderWidth: 1, borderColor: colors.palm, backgroundColor: colors.surface },
  dim: { opacity: 0.5 },
  label: { fontFamily: fonts.sansSemi, fontSize: 16 },
  primaryLabel: { color: colors.white },
  secondaryLabel: { color: colors.palm },
  note: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.inkMuted, textAlign: "center" },
  error: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay, textAlign: "center" },
});
