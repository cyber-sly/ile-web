import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useIsFocused, useLocalSearchParams } from "expo-router";
import { onlineManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react-native";
import { canEdit, cleanMessage, editMessage, fetchThread, MAX_MESSAGE, markRead } from "@shared/messaging.js";
import { friendlyError } from "@shared/errors.js";
import { fetchPeople } from "@shared/people.js";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { outbox, useOutboxItems } from "@/lib/outboxApp";
import { refreshUnread } from "@/lib/unread";
import { idsToMarkRead, lastSeenId, mergeMessages, withDayBreaks, type ChatRow, type Message } from "@/lib/chatMessages";
import { uniqueTopic } from "@/lib/realtime";
import { keyboardBehavior } from "@/components/keyboardBehavior";
import MessageBubble from "@/components/MessageBubble";
import Button from "@/components/Button";
import { colors, fonts, radius } from "@/theme";
import Tap from "@/components/kit/Tap";
import PresenceLine from "@/components/PresenceLine";
import ProfilePhoto from "@/components/ProfilePhoto";
import { useChatPresence } from "@/lib/presence";

type Thread = {
  convo: { id: string; tenant_id: string | null; landlord_id: string | null; listings: { id: string; title: string; image_url: string | null } | null } | null;
  messages: Message[];
  other: { name: string; avatar: string | null } | null;
  otherId?: string | null;
};

async function loadChat(id: string, userId: string): Promise<Thread> {
  const { convo, messages } = await fetchThread(supabase, id);
  if (!convo) return { convo: null, messages: [], other: null };
  const otherId = convo.tenant_id === userId ? convo.landlord_id : convo.tenant_id;
  const people = otherId ? await fetchPeople(supabase, [otherId]) : {};
  return { convo, messages, otherId, other: otherId ? people[otherId] || { name: "", avatar: null } : null };
}

// One conversation, live: new messages, read receipts, offline sending.
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const pending = useOutboxItems(id);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList>(null);

  const chatKey = ["chat", id, userId];
  const chat = useQuery({ queryKey: chatKey, queryFn: () => loadChat(id, userId), enabled: Boolean(userId) });
  const presence = useChatPresence(chat.data?.other ? [id] : []);

  // Live updates for this conversation.
  useEffect(() => {
    const channel = supabase
      .channel(uniqueTopic(`chat-${id}`))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) =>
        queryClient.setQueryData<Thread>(["chat", id, userId], (t) => (t ? { ...t, messages: [...t.messages, payload.new as Message] } : t))
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (payload) =>
        queryClient.setQueryData<Thread>(["chat", id, userId], (t) =>
          t ? { ...t, messages: t.messages.map((m) => (m.id === (payload.new as Message).id ? { ...m, ...(payload.new as Message) } : m)) } : t
        )
      )
      .subscribe();
    // Realtime can drop while the app is in the background: catch up on return.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") queryClient.invalidateQueries({ queryKey: ["chat", id] });
    });
    const unsubOnline = onlineManager.subscribe((online) => {
      if (online) queryClient.invalidateQueries({ queryKey: ["chat", id] });
    });
    return () => {
      supabase.removeChannel(channel);
      sub.remove();
      unsubOnline();
    };
  }, [id, userId, queryClient]);

  // Mark the other person's messages read only while this chat is on screen
  // and the app is open, and ask for each message once.
  const messages = chat.data?.messages;
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const requested = useRef(new Set<string>());
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!messages || !userId || !focused || !appActive) return;
    const ids = idsToMarkRead(messages, userId, requested.current);
    if (ids.length === 0) return;
    ids.forEach((i) => requested.current.add(i));
    markRead(supabase, ids).then(refreshUnread, () => ids.forEach((i) => requested.current.delete(i)));
  }, [messages, userId, focused, appActive]);

  const rows = useMemo(() => mergeMessages(messages || [], pending), [messages, pending]);
  const items = useMemo(() => withDayBreaks(rows).reverse(), [rows]);
  const seenId = lastSeenId(rows, userId);

  // Editing a sent message (within 3 minutes).
  const [editing, setEditing] = useState<ChatRow | null>(null);
  const [editError, setEditError] = useState("");
  const [online, setOnline] = useState(onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(setOnline), []);
  // Re-check every few seconds so Edit disappears when the 3 minutes pass.
  const [, setTick] = useState(0);
  const anyEditable = rows.some((r) => canEdit(r, userId));
  useEffect(() => {
    if (!anyEditable) return;
    const timer = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(timer);
  }, [anyEditable]);

  function startEdit(row: ChatRow) {
    setEditing(row);
    setDraft(row.body);
    setEditError("");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
    setEditError("");
  }

  async function saveEdit(row: ChatRow) {
    try {
      const updated = (await editMessage(supabase, row.id, draft)) as Message;
      queryClient.setQueryData<Thread>(chatKey, (t) => (t ? { ...t, messages: t.messages.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)) } : t));
      cancelEdit();
    } catch (e) {
      setEditError(friendlyError(e));
    }
  }

  async function send() {
    if (editing) return saveEdit(editing);
    const body = cleanMessage(draft);
    if (!body) return;
    setDraft("");
    await outbox.add(id, body);
    outbox.flush();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const t = chat.data;
  const header = (
    <View style={styles.header}>
      <Tap accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => router.back()} style={styles.back}>
        <ArrowLeft color={colors.ink} size={22} />
      </Tap>
      {t?.other?.avatar ? (
        <ProfilePhoto uri={t.other.avatar} name={t.other.name} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.initial]}>
          <Text style={styles.initialText}>{(t?.other?.name || "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.headerText}>
        <Text
          style={styles.name}
          numberOfLines={1}
          accessibilityRole={t?.otherId ? "link" : undefined}
          onPress={t?.otherId ? () => router.push({ pathname: "/u/[id]", params: { id: String(t.otherId) } }) : undefined}
        >
          {t?.convo ? (t.other ? t.other.name || (t.convo.tenant_id === userId ? "The lister" : "Home-seeker") : "Deleted user") : ""}
        </Text>
        {t?.other ? <PresenceLine lastSeenAt={presence[id]} /> : null}
        {t?.convo && (
          <Tap
            disabled={!t.convo.listings}
            onPress={() => t.convo?.listings && router.push({ pathname: "/listing/[id]", params: { id: String(t.convo.listings.id) } })}
          >
            <Text style={styles.listing} numberOfLines={1}>
              {t.convo.tenant_id === userId ? "Lister" : "Home-seeker"} · {t.convo.listings?.title || "Listing removed"}
            </Text>
          </Tap>
        )}
      </View>
    </View>
  );

  if (chat.isPending) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <ActivityIndicator color={colors.palm} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (chat.isError || !t?.convo) {
    return (
      <SafeAreaView style={styles.safe}>
        {header}
        <View style={styles.center}>
          <Text style={styles.centerTitle}>{chat.isError ? "Couldn't load this chat" : "Chat not found"}</Text>
          <Button label="Back to messages" variant="secondary" onPress={() => router.navigate("/inbox")} />
        </View>
      </SafeAreaView>
    );
  }

  const canSend = cleanMessage(draft) !== null && (!editing || online);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior={keyboardBehavior(Platform.OS)}>
        <FlatList
          ref={listRef}
          inverted
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) =>
            "day" in item ? (
              <Text style={styles.day}>{item.day}</Text>
            ) : (
              <MessageBubble
                row={item as ChatRow}
                mine={(item as ChatRow).pending !== undefined || (item as ChatRow).sender_id === userId}
                seen={item.id === seenId}
                onRetry={() => (item as ChatRow).localId && outbox.retry((item as ChatRow).localId!)}
                onEdit={!editing && online && canEdit(item, userId) ? () => startEdit(item as ChatRow) : undefined}
              />
            )
          }
          ListFooterComponent={
            <View style={styles.safety}>
              <ShieldCheck color={colors.palm} size={16} />
              <Text style={styles.safetyText}>Keep chats on Ile. Never pay before you&apos;ve viewed a property in person.</Text>
            </View>
          }
        />
        {editing ? (
          <View style={styles.editBar}>
            <Text style={styles.editTitle}>Editing message</Text>
            <Tap accessibilityRole="button" onPress={cancelEdit} hitSlop={8}>
              <Text style={styles.editCancel}>Cancel</Text>
            </Tap>
          </View>
        ) : null}
        {editError ? <Text style={styles.editError}>{editError}</Text> : null}
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={colors.inkMuted}
            multiline
            maxLength={MAX_MESSAGE}
            style={styles.input}
            accessibilityLabel="Message"
          />
          <Tap
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!canSend}
            onPress={send}
            style={[styles.send, !canSend && styles.sendOff]}
          >
            <Send color={colors.white} size={18} />
          </Tap>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  back: { padding: 4 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  initial: { alignItems: "center", justifyContent: "center", backgroundColor: colors.palmSoft },
  initialText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.palm },
  headerText: { flex: 1 },
  name: { fontFamily: fonts.sansSemi, fontSize: 16, color: colors.ink },
  listing: { fontFamily: fonts.sans, fontSize: 12, color: colors.palm },
  loading: { marginTop: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  centerTitle: { fontFamily: fonts.sansSemi, fontSize: 17, color: colors.ink },
  messages: { paddingHorizontal: 14, paddingVertical: 12 },
  day: { alignSelf: "center", fontFamily: fonts.sansSemi, fontSize: 12, color: colors.inkMuted, marginVertical: 10 },
  safety: { flexDirection: "row", gap: 8, padding: 12, marginBottom: 8, borderRadius: radius.control, backgroundColor: colors.palmSoft },
  safetyText: { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.cream,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.palm },
  sendOff: { opacity: 0.4 },
  editBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.palmSoft, borderTopWidth: 1, borderTopColor: colors.line },
  editTitle: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.palm },
  editCancel: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.ink },
  editError: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.clay, paddingHorizontal: 16, paddingTop: 6 },
});
