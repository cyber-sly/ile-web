import { Tabs } from "expo-router";
import { Search, Heart, MessageCircle, CalendarDays, LayoutDashboard, UserRound } from "lucide-react-native";
import { isLister, useSession } from "@/lib/useSession";
import { colors, fonts } from "@/theme";

// Same five tabs as the mobile website.
export default function TabLayout() {
  const { user } = useSession();
  const lister = isLister(user);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.palm,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Search", tabBarIcon: ({ color }) => <Search color={color} size={22} /> }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color }) => <Heart color={color} size={22} /> }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} /> }} />
      <Tabs.Screen
        name="viewings"
        options={{
          title: lister ? "Dashboard" : "Viewings",
          tabBarIcon: ({ color }) => (lister ? <LayoutDashboard color={color} size={22} /> : <CalendarDays color={color} size={22} />),
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color }) => <UserRound color={color} size={22} /> }} />
    </Tabs>
  );
}
