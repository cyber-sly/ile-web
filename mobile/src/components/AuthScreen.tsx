import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { PhotoHeader } from "@/components/kit";
import { colors, fonts, radius } from "@/theme";
import { keyboardBehavior } from "./keyboardBehavior";

export const LOGIN_PHOTO = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=70";
export const SIGNUP_PHOTO = "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=70";

function close() {
  if (router.canDismiss()) router.dismiss();
  else if (router.canGoBack()) router.back();
  else router.replace("/");
}

// The website's AuthShell on a phone: the photo panel becomes a header with
// the quote, and the form sits below on cream.
export default function AuthScreen({
  image,
  quote,
  title,
  subtitle,
  children,
}: {
  image: string;
  quote?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={styles.page} behavior={keyboardBehavior(Platform.OS)}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <PhotoHeader image={image} quote={quote} onClose={close} height={quote ? 220 : 150} />
        <View style={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// The website's Alert box for a form error.
export function FormError({ children }: { children: string }) {
  return (
    <View style={styles.alert} accessibilityRole="alert">
      <Text style={styles.alertText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 48 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink },
  subtitle: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.inkMuted, marginTop: 6 },
  body: { marginTop: 24, gap: 18 },
  alert: { padding: 12, borderRadius: radius.control, borderWidth: 1, borderColor: "#EBC3B6", backgroundColor: colors.claySoft },
  alertText: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: colors.clay },
});
