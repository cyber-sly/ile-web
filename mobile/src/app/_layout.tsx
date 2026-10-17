import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Fraunces_500Medium } from "@expo-google-fonts/fraunces/500Medium";
import { Fraunces_400Regular_Italic } from "@expo-google-fonts/fraunces/400Regular_Italic";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { SessionProvider } from "@/lib/useSession";
import { persister, PERSIST_MAX_AGE, queryClient, shouldPersist } from "@/lib/queryClient";
import OfflineBanner from "@/components/OfflineBanner";
// Started here, not from a screen: screens load lazily in release builds.
import "@/lib/outboxApp";
import { usePushTaps } from "@/lib/push";
import { colors, fonts } from "@/theme";

SplashScreen.preventAutoHideAsync();

// Opens the right screen when a notification is tapped.
function PushTaps() {
  usePushTaps();
  return null;
}

const persistOptions = { persister, maxAge: PERSIST_MAX_AGE, dehydrateOptions: { shouldDehydrateQuery: shouldPersist } };

export default function RootLayout() {
  const [loaded, fontError] = useFonts({ Fraunces_600SemiBold, Fraunces_500Medium, Fraunces_400Regular_Italic, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  // If fonts fail to load, carry on with system fonts rather than a blank screen.
  const ready = loaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SessionProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.cream }}>
          <OfflineBanner />
          <PushTaps />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.cream },
              headerStyle: { backgroundColor: colors.cream },
              headerTintColor: colors.palm,
              headerTitleStyle: { fontFamily: fonts.sansSemi, color: colors.ink },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen
              name="filters"
              options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }}
            />
            <Stack.Screen name="listing/[id]" options={{ title: "" }} />
            <Stack.Screen
              name="book/[id]"
              options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true }}
            />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="my-viewings" options={{ title: "My bookings" }} />
            <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
            <Stack.Screen name="u/[id]" options={{ title: "" }} />
            <Stack.Screen name="account/profile" options={{ title: "Edit profile" }} />
            <Stack.Screen name="account/password" options={{ title: "Change password" }} />
            <Stack.Screen name="account/delete" options={{ title: "Delete account" }} />
            <Stack.Screen name="list/new" options={{ title: "List a property" }} />
            <Stack.Screen name="list/[id]/edit" options={{ title: "Edit listing" }} />
            <Stack.Screen name="list/[id]/times" options={{ title: "Booking times" }} />
            <Stack.Screen name="(auth)/login" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="(auth)/signup" options={{ headerShown: false, presentation: "modal" }} />
            <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false, presentation: "modal" }} />
          </Stack>
        </View>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}
