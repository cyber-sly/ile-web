import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, fonts } from "@/theme";
import Logo from "./Logo";
import Shade from "./Shade";

// The website's sign-in photo panel (AuthShell) as a header on phones: photo,
// dark gradient, Ile logo, close button and a serif quote.
export default function PhotoHeader({ image, quote, onClose, height = 220 }: { image: string; quote?: ReactNode; onClose?: () => void; height?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height: height + insets.top }}>
      <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" alt="" />
      <Shade colors={["rgba(15,28,21,0.35)", "rgba(15,28,21,0.1)", "rgba(15,28,21,0.85)"]} locations={[0, 0.45, 1]} />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        {onClose ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose} style={styles.close}>
            <X size={18} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.close} />
        )}
        <Logo onDark size={22} />
        <View style={styles.spacer} />
      </View>
      {quote ? <Text style={styles.quote}>{quote}</Text> : null}
    </View>
  );
}

// Italic part of a serif quote or headline ("without the wahala.").
export function Em({ children }: { children: ReactNode }) {
  return <Text style={{ fontFamily: fonts.serifItalic }}>{children}</Text>;
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,253,248,0.9)" },
  spacer: { width: 34 },
  quote: { position: "absolute", left: 20, right: 20, bottom: 18, fontFamily: fonts.serifMedium, fontSize: 24, lineHeight: 30, color: colors.white },
});
