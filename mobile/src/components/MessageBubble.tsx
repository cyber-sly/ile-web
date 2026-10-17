import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { ChatRow } from "@/lib/chatMessages";
import { colors, fonts } from "@/theme";
import Tap from "@/components/kit/Tap";

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

// One chat message. Yours sit on the right in palm green.
// onEdit is passed only while the message can still be edited (canEdit).
export default function MessageBubble({
  row,
  mine,
  seen,
  onRetry,
  onEdit,
}: {
  row: ChatRow;
  mine: boolean;
  seen: boolean;
  onRetry: () => void;
  onEdit?: () => void;
}) {
  let status = clock(row.created_at);
  if (row.edited_at) status += " · edited";
  if (row.pending === "waiting" || row.pending === "sending") status = "Waiting for connection";
  if (seen) status += " · Seen";

  const bubble = (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, row.pending && styles.pending]}>
      <Text style={[styles.body, mine && styles.bodyMine]}>{row.body}</Text>
    </View>
  );

  return (
    <View style={[styles.wrap, mine ? styles.right : styles.left]}>
      {row.pending === "failed" ? (
        <Tap accessibilityRole="button" accessibilityLabel="Not sent. Tap to retry." onPress={onRetry}>
          {bubble}
          <Text style={[styles.status, styles.failed]}>Not sent. Tap to retry.</Text>
        </Tap>
      ) : (
        <>
          {onEdit ? (
            <Pressable
              accessibilityHint="Long-press to edit"
              onLongPress={() =>
                Alert.alert("Your message", undefined, [
                  { text: "Edit", onPress: onEdit },
                  { text: "Cancel", style: "cancel" },
                ])
              }
            >
              {bubble}
            </Pressable>
          ) : (
            bubble
          )}
          <Text style={styles.status}>{status}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: "82%", marginVertical: 3 },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mine: { backgroundColor: colors.palm, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  pending: { opacity: 0.6 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, color: colors.ink },
  bodyMine: { color: colors.white },
  status: { fontFamily: fonts.sans, fontSize: 12, color: colors.inkMuted, marginTop: 3, marginHorizontal: 4 },
  failed: { color: colors.clay, fontFamily: fonts.sansMedium },
});
