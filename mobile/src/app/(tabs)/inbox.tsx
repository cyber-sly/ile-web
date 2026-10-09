import { useEffect } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, WifiOff } from "lucide-react-native";
import { loadThreads, shortTime } from "@shared/messaging.js";
import { supabase } from "@/lib/supabase";
import { uniqueTopic } from "@/lib/realtime";
import { useSession } from "@/lib/useSession";
import Screen from "@/components/Screen";
import Button from "@/components/Button";
import { useOnline } from "@/components/OfflineBanner";
import { colors, fonts } from "@/theme";

type Thread = {
  id: string;
  otherName: string;
  otherAvatar: string | null;
  role: string;
  listing: { id: string; title: string } | null;
  latest?: { body: string; sender_id: string | null; created_at: string };
  unread: number;
};

async function fetchInbox(userId: string): Promise<Thread[]> {
  const { threads, error } = await loadThreads(supabase, userId);
  if (error) throw new Error(error);
  return threads;
}

// Conversations, newest first, updated live.
export default function InboxTab() {
  const { user } = useSession();
  const online = useOnline();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const inbox = useQuery({ queryKey: ["inbox", userId], queryFn: () => fetchInbox(userId), enabled: Boolean(userId) });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(uniqueTopic(`inbox-${userId}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () =>
        queryClient.invalidateQueries({ queryKey: ["inbox", userId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  if (!user) {
    return (
      <Screen title="Messages" subtitle="Chat with listers and home-seekers here, without sharing your number.">
        <Button label="Log in to see your messages" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  let empty;
  if (inbox.isPending && !online) {
    empty = (
      <View style={styles.empty}>
        <WifiOff color={colors.inkMuted} size={28} />
        <Text style={styles.emptyTitle}>Connect to load your messages</Text>
      </View>
    );
  } else if (inbox.isPending) {
    empty = <ActivityIndicator color={colors.palm} style={styles.loading} />;
  } else if (inbox.isError) {
    empty = (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Couldn&apos;t load your messages</Text>
        <Button label="Try again" variant="secondary" onPress={() => inbox.refetch()} />
      </View>
    );
  } else {
    empty = (
      <View style={styles.empty}>
        <MessagesSquare color={colors.inkMuted} size={30} />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyBody}>Message a lister from any listing.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={inbox.data || []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => <ThreadRow thread={item} userId={userId} />}
        ListHeaderComponent={<Text style={styles.title}>Messages</Text>}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => inbox.refetch()} tintColor={colors.palm} />}
      />
    </SafeAreaView>
  );
}

function ThreadRow({ thread: t, userId }: { thread: Thread; userId: string }) {
  const unread = t.unread > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.otherName}${unread ? `, ${t.unread} unread` : ""}`}
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(t.id) } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {t.otherAvatar ? (
        <Image source={{ uri: t.otherAvatar }} style={styles.avatar} cachePolicy="disk" alt="" />
      ) : (
        <View style={[styles.avatar, styles.initial]}>
          <Text style={styles.initialText}>{t.otherName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.text}>
        <View style={styles.line}>
          <Text style={[styles.name, unread && styles.bold]} numberOfLines={1}>
            {t.otherName}
          </Text>
          {t.latest && <Text style={styles.time}>{shortTime(t.latest.created_at)}</Text>}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {t.role} · {t.listing?.title || "Listing removed"}
        </Text>
        <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
          {t.latest ? `${t.latest.sender_id === userId ? "You: " : ""}${t.latest.body}` : "No messages yet"}
        </Text>
      </View>
      {unread && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t.unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  list: { paddingBottom: 40 },
  title: { fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 4, marginBottom: 12, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.surface },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.palm },
  text: { flex: 1, gap: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink },
  bold: { fontFamily: fonts.sansBold },
  time: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  meta: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted },
  preview: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  previewUnread: { fontFamily: fonts.sansSemi, color: colors.ink },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.palm },
  badgeText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.white },
  loading: { marginTop: 40 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink, textAlign: "center" },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, textAlign: "center" },
});
