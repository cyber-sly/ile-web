import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Video, X } from "lucide-react-native";
import { MAX_PHOTOS, MAX_VIDEOS } from "@shared/lister.js";
import { friendlyError } from "@shared/errors.js";
import { pickPhotos, pickVideos, takePhoto } from "@/lib/media";
import type { PhotoItem } from "@/lib/draftStore";
import Button from "@/components/Button";
import { colors, fonts, radius } from "@/theme";
import { ErrorText, Hint } from "../parts";

type Props = {
  photos: PhotoItem[];
  videos: PhotoItem[];
  setPhotos: (photos: PhotoItem[]) => void;
  setVideos: (videos: PhotoItem[]) => void;
  error?: string;
};

const uriOf = (p: PhotoItem) => (p.kind === "saved" ? p.url : p.media.uri);

// Step 5: photos (camera or gallery; reorder; the first is the cover) and videos.
export default function Photos({ photos, videos, setPhotos, setVideos, error }: Props) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setProblem("");
    try {
      await task();
    } catch (e) {
      setProblem(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const camera = () =>
    run(async () => {
      if (photos.length >= MAX_PHOTOS) return setProblem(`You can add up to ${MAX_PHOTOS} photos.`);
      const shot = await takePhoto();
      if (shot === "denied") setProblem("Allow camera access in Settings to take photos.");
      else if (shot) setPhotos([...photos, { kind: "local", media: shot }]);
    });

  const gallery = () =>
    run(async () => {
      const picked = await pickPhotos(MAX_PHOTOS - photos.length);
      if (picked.length) setPhotos([...photos, ...picked.map((media) => ({ kind: "local" as const, media }))]);
    });

  const addVideos = () =>
    run(async () => {
      const { media, problem: issue } = await pickVideos(MAX_VIDEOS - videos.length);
      if (media.length) setVideos([...videos, ...media.map((m) => ({ kind: "local" as const, media: m }))]);
      if (issue) setProblem(issue);
    });

  function move(i: number, by: number) {
    const next = [...photos];
    const [item] = next.splice(i, 1);
    next.splice(i + by, 0, item);
    setPhotos(next);
  }

  return (
    <>
      <Hint>
        Clear, bright photos get more viewings. The first photo is the cover. Up to {MAX_PHOTOS} photos.
      </Hint>
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button label="Take photo" variant="secondary" disabled={busy} onPress={camera} />
        </View>
        <View style={styles.flex}>
          <Button label="Choose photos" variant="secondary" disabled={busy} onPress={gallery} />
        </View>
      </View>
      {busy && <ActivityIndicator color={colors.palm} />}
      <ErrorText>{problem || error}</ErrorText>

      {photos.length === 0 ? (
        <View style={styles.empty}>
          <Camera color={colors.inkMuted} size={28} />
          <Text style={styles.muted}>No photos yet</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {photos.map((p, i) => (
            <View key={uriOf(p)} style={styles.tile}>
              <Image source={{ uri: uriOf(p) }} style={styles.photo} contentFit="cover" alt={`Photo ${i + 1}`} />
              {i === 0 && <Text style={styles.cover}>Cover</Text>}
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} hitSlop={6} onPress={() => setPhotos(photos.filter((_, j) => j !== i))} style={styles.remove}>
                <X color={colors.white} size={14} />
              </Pressable>
              <View style={styles.moves}>
                {i > 0 && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move photo ${i + 1} earlier`} hitSlop={6} onPress={() => move(i, -1)} style={styles.moveButton}>
                    <ArrowLeft color={colors.white} size={14} />
                  </Pressable>
                )}
                {i < photos.length - 1 && (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move photo ${i + 1} later`} hitSlop={6} onPress={() => move(i, 1)} style={styles.moveButton}>
                    <ArrowRight color={colors.white} size={14} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable accessibilityRole="button" accessibilityLabel="Add more photos" onPress={gallery} style={[styles.tile, styles.add]}>
              <ImagePlus color={colors.palm} size={24} />
            </Pressable>
          )}
        </View>
      )}

      <Text style={styles.section}>Videos (optional)</Text>
      <Hint>Up to {MAX_VIDEOS} videos, 50 MB each. A short walk-through helps.</Hint>
      {videos.map((v, i) => (
        <View key={uriOf(v)} style={styles.videoRow}>
          <Video color={colors.palm} size={18} />
          <Text style={styles.videoText}>Video {i + 1}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove video ${i + 1}`} onPress={() => setVideos(videos.filter((_, j) => j !== i))}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}
      {videos.length < MAX_VIDEOS && <Button label="Add a video" variant="ghost" disabled={busy} onPress={addVideos} />}
    </>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  empty: { alignItems: "center", gap: 6, paddingVertical: 28, borderRadius: radius.card, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong },
  muted: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31.5%", aspectRatio: 1, borderRadius: radius.control, overflow: "hidden", backgroundColor: colors.line },
  photo: { width: "100%", height: "100%" },
  cover: {
    position: "absolute",
    left: 6,
    top: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: colors.palm,
    color: colors.white,
    fontFamily: fonts.sansSemi,
    fontSize: 12,
  },
  remove: { position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,27,22,0.7)" },
  moves: { position: "absolute", left: 6, right: 6, bottom: 6, flexDirection: "row", justifyContent: "space-between" },
  moveButton: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(30,27,22,0.7)" },
  add: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderColor: colors.palm, backgroundColor: colors.palmSoft },
  section: { fontFamily: fonts.sansSemi, fontSize: 15, color: colors.ink, marginTop: 8 },
  videoRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  videoText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  removeText: { fontFamily: fonts.sansSemi, fontSize: 14, color: colors.clay },
});
