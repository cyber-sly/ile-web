import { Tabs } from "expo-router";
import { House, Heart, MessageCircle, CalendarDays, LayoutDashboard, UserRound } from "lucide-react-native";
import { isLister, useSession } from "@/lib/useSession";
import { useUnreadCount } from "@/lib/unread";
import { accountTabTitle } from "@/lib/ui/home";
import { colors, fonts } from "@/theme";

// Home first, like the website; the last tab says "Log in" when logged out.
export default function TabLayout() {
  const { user } = useSession();
  const lister = isLister(user);
  const unread = useUnreadCount(user?.id ?? null);

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
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <House color={color} size={22} /> }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color }) => <Heart color={color} size={22} /> }} />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={22} />,
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.clay, fontFamily: fonts.sansBold, fontSize: 11 },
        }}
      />
      <Tabs.Screen
        name="viewings"
        options={{
          title: lister ? "Dashboard" : "Viewings",
          tabBarIcon: ({ color }) => (lister ? <LayoutDashboard color={color} size={22} /> : <CalendarDays color={color} size={22} />),
        }}
      />
      <Tabs.Screen name="account" options={{ title: accountTabTitle(user), tabBarIcon: ({ color }) => <UserRound color={color} size={22} /> }} />
    </Tabs>
  );
}
