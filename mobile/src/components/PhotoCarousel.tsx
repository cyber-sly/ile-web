import { useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Expand, ImageOff } from "lucide-react-native";
import Tap from "@/components/kit/Tap";
import PhotoViewer from "@/components/PhotoViewer";
import { colors, fonts } from "@/theme";

const MAX_DOTS = 8;

// Swipeable photos with page dots and a "3 / 12" counter. Tapping a photo
// opens it full screen, where it can be zoomed.
export default function PhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
  const height = Math.round((width * 3) / 4);

  if (photos.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <ImageOff color={colors.inkMuted} size={32} />
        <Text style={styles.emptyText}>No photos yet</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={photos}
        keyExtractor={(url, i) => `${i}-${url}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <Tap
            accessibilityRole="imagebutton"
            accessibilityLabel={`${title}, photo ${i + 1} of ${photos.length}. Opens full screen.`}
            onPress={() => setViewing(i)}
            feedback={false}
          >
            <Image source={{ uri: item }} style={{ width, height }} contentFit="cover" cachePolicy="disk" transition={150} alt="" />
          </Tap>
        )}
      />
      {photos.length > 1 && photos.length <= MAX_DOTS && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((url, i) => (
            <View key={`${i}-${url}`} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      )}
      <View style={styles.counter} pointerEvents="none">
        <Expand color={colors.white} size={13} />
        {photos.length > 1 ? (
          <Text style={styles.counterText}>
            {index + 1} / {photos.length}
          </Text>
        ) : null}
      </View>
      <PhotoViewer photos={photos} title={title} start={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.line },
  emptyText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  dots: { position: "absolute", bottom: 16, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.55)" },
  dotOn: { width: 18, backgroundColor: colors.white },
  counter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(30,27,22,0.7)",
  },
  counterText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.white },
});
