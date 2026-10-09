import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";
import { keyboardBehavior } from "./keyboardBehavior";

// Standard page: safe area, cream background, scrolls, and keeps inputs
// above the keyboard on small phones.
export default function Screen({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior(Platform.OS)}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.ink, lineHeight: 38 },
  subtitle: { fontFamily: fonts.sans, fontSize: 16, color: colors.inkMuted, marginTop: 6, lineHeight: 22 },
  body: { marginTop: 24, gap: 16 },
});
