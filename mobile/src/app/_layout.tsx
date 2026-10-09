import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { SessionProvider } from "@/lib/useSession";
import { persister, PERSIST_MAX_AGE, queryClient, shouldPersist } from "@/lib/queryClient";
import OfflineBanner from "@/components/OfflineBanner";
import { colors, fonts } from "@/theme";

SplashScreen.preventAutoHideAsync();

const persistOptions = { persister, maxAge: PERSIST_MAX_AGE, dehydrateOptions: { shouldDehydrateQuery: shouldPersist } };

export default function RootLayout() {
  const [loaded, fontError] = useFonts({ Fraunces_600SemiBold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
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
            <Stack.Screen
              name="filters"
              options={{ headerShown: false, presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true }}
            />
            <Stack.Screen name="listing/[id]" options={{ title: "" }} />
            <Stack.Screen name="(auth)/login" options={{ title: "Log in", presentation: "modal" }} />
            <Stack.Screen name="(auth)/signup" options={{ title: "Create account", presentation: "modal" }} />
            <Stack.Screen name="(auth)/forgot-password" options={{ title: "Forgot password", presentation: "modal" }} />
          </Stack>
        </View>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}
