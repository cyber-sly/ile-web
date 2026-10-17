import { useEffect } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { presenceLabel } from "@shared/presence.js";
import { useChatPresence } from "@/lib/presence";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, WifiOff } from "lucide-react-native";
import { loadThreads, shortTime } from "@shared/messaging.js";
import { supabase } from "@/lib/supabase";
import { uniqueTopic } from "@/lib/realtime";
import { useSession } from "@/lib/useSession";
import Screen from "@/components/Screen";
import { Button, EmptyState, PageTitle, RowSkeleton } from "@/components/kit";
import NotificationsCard from "@/components/NotificationsCard";
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
  const presence = useChatPresence((inbox.data || []).map((t) => String(t.id)));

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
    empty = <EmptyState icon={WifiOff} title="Connect to load your messages" />;
  } else if (inbox.isPending) {
    empty = (
      <View>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </View>
    );
  } else if (inbox.isError) {
    empty = (
      <EmptyState
        icon={WifiOff}
        tone="clay"
        title="Couldn't load your messages"
        action={<Button label="Try again" variant="secondary" full={false} onPress={() => inbox.refetch()} />}
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={MessagesSquare}
        title="No messages yet"
        action={<Button label="Browse listings" full={false} onPress={() => router.navigate("/search")} />}
      >
        Tap “Message lister” on any listing to ask a question before you fix a booking.
      </EmptyState>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={inbox.data || []}
        keyExtractor={(t) => String(t.id)}
        renderItem={({ item }) => <ThreadRow thread={item} userId={userId} online={Boolean(presenceLabel(presence[String(item.id)])?.online)} />}
        ListHeaderComponent={
          <View>
            <View style={styles.titleWrap}>
              <PageTitle>Messages</PageTitle>
            </View>
            <View style={styles.cardWrap}>
              <NotificationsCard />
            </View>
          </View>
        }
        ListEmptyComponent={<View style={styles.emptyWrap}>{empty}</View>}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => inbox.refetch()} tintColor={colors.palm} />}
      />
    </SafeAreaView>
  );
}

function ThreadRow({ thread: t, userId, online }: { thread: Thread; userId: string; online: boolean }) {
  const unread = t.unread > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.otherName}${unread ? `, ${t.unread} unread` : ""}`}
      onPress={() => router.push({ pathname: "/chat/[id]", params: { id: String(t.id) } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View>
        {t.otherAvatar ? (
          <Image source={{ uri: t.otherAvatar }} style={styles.avatar} cachePolicy="disk" alt="" />
        ) : (
          <View style={[styles.avatar, styles.initial]}>
            <Text style={styles.initialText}>{t.otherName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {online ? <View style={styles.dot} accessibilityLabel="Online" /> : null}
      </View>
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
  cardWrap: { paddingHorizontal: 16 },
  emptyWrap: { paddingHorizontal: 16, paddingTop: 8 },
  titleWrap: { paddingHorizontal: 16, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { backgroundColor: colors.surface },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  dot: { position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.palm, borderWidth: 2, borderColor: colors.cream },
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
});
