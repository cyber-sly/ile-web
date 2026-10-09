import { useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { colors, fonts } from "@/theme";

// Swipeable photos with a "3 / 12" counter.
export default function PhotoCarousel({ photos, title }: { photos: string[]; title: string }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
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
          <Image
            source={{ uri: item }}
            style={{ width, height }}
            contentFit="cover"
            cachePolicy="disk"
            transition={150}
            accessibilityLabel={`${title}, photo ${i + 1} of ${photos.length}`}
          />
        )}
      />
      {photos.length > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.line },
  emptyText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkMuted },
  counter: {
    position: "absolute",
    right: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(30,27,22,0.7)",
  },
  counterText: { fontFamily: fonts.sansSemi, fontSize: 13, color: colors.white },
});
