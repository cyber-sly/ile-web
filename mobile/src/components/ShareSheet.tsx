import { useState } from "react";
import { Modal, Share, StyleSheet, Text, View } from "react-native";
import { Image as ImageIcon, Link2, X } from "lucide-react-native";
import { canShareImages, cardUrl, SITE, shareMessage } from "@/lib/referrals";
import { useOnline } from "@/components/OfflineBanner";
import { Button } from "@/components/kit";
import type { ListingRow } from "@/components/PropertyCard";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";
import Animated, { SlideInDown } from "react-native-reanimated";

// Share a listing: a tracked link for chats, or (on builds with expo-sharing)
// the ready-made picture for WhatsApp Status and Instagram Stories.
export default function ShareSheet({
  listing,
  code,
  visible,
  onClose,
}: {
  listing: ListingRow;
  code: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const message = shareMessage({ listing, site: SITE, code });

  async function sendLink() {
    try {
      await Share.share({ message });
    } catch {}
  }

  async function postImage() {
    if (!online) {
      setNote("Connect to make the image");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      const Sharing = await import("expo-sharing");
      const { File, Paths } = await import("expo-file-system");
      const file = new File(Paths.cache, `ile-listing-${listing.id}.png`);
      if (file.exists) file.delete();
      const saved = await File.downloadFileAsync(cardUrl({ site: SITE, listingId: listing.id, code }), file);
      await Sharing.shareAsync(saved.uri, { mimeType: "image/png", dialogTitle: listing.title });
    } catch {
      setNote("We couldn't make the image. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Tap feedback={false} style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View entering={SlideInDown.duration(260)} style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Share this listing
          </Text>
          <Tap accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
            <X color={colors.inkMuted} size={22} />
          </Tap>
        </View>
        {code ? <Text style={styles.muted}>Your link includes your code {code}, so people who join count for you.</Text> : null}
        <Button label="Send link" icon={Link2} onPress={sendLink} />
        {canShareImages() ? <Button label="Post to Status / Stories" variant="secondary" icon={ImageIcon} loading={busy} onPress={postImage} /> : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(30,27,22,0.4)" },
  sheet: {
    gap: 12,
    padding: 20,
    paddingBottom: 36,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    backgroundColor: colors.surface,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkMuted },
  note: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.clay },
});
