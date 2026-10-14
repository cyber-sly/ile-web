import { useCallback, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { X } from "lucide-react-native";
import Tap from "@/components/kit/Tap";
import { colors, fonts } from "@/theme";

const MAX_ZOOM = 4;

// Full-screen photos (the website's Lightbox): swipe between them, pinch or
// double-tap to zoom, drag a zoomed photo around.
export default function PhotoViewer({
  photos,
  title,
  start,
  onClose,
}: {
  photos: string[];
  title: string;
  start: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start ?? 0);
  const [zoomed, setZoomed] = useState(false);
  const [shownFor, setShownFor] = useState(start);
  // Reopening at a different photo starts there.
  if (start !== shownFor) {
    setShownFor(start);
    if (start !== null) setIndex(start);
  }

  const renderItem = useCallback(
    ({ item, index: i }: { item: string; index: number }) => (
      <ZoomableImage uri={item} width={width} height={height} label={`${title}, photo ${i + 1} of ${photos.length}`} onZoomChange={setZoomed} />
    ),
    [width, height, title, photos.length]
  );

  return (
    <Modal visible={start !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={["portrait"]}>
      <StatusBar style="light" />
      <GestureHandlerRootView style={styles.root}>
        <FlatList
          data={photos}
          keyExtractor={(url, i) => `${i}-${url}`}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={start ?? 0}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={renderItem}
        />
        <View style={[styles.bar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Text style={styles.counter} accessibilityLiveRegion="polite">
            {index + 1} / {photos.length}
          </Text>
          <Tap accessibilityRole="button" accessibilityLabel="Close photos" onPress={onClose} style={styles.close}>
            <X color={colors.white} size={22} />
          </Tap>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({
  uri,
  width,
  height,
  label,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  label: string;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Keep a zoomed photo from being dragged off screen.
  function clamp(value: number, s: number, size: number) {
    "worklet";
    const limit = ((s - 1) * size) / 2;
    return Math.min(limit, Math.max(-limit, value));
  }

  function reset() {
    "worklet";
    scale.set(withTiming(1));
    savedScale.set(1);
    x.set(withTiming(0));
    y.set(withTiming(0));
    savedX.set(0);
    savedY.set(0);
    runOnJS(onZoomChange)(false);
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(MAX_ZOOM, Math.max(0.8, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      if (scale.get() <= 1.05) {
        reset();
        return;
      }
      savedScale.set(scale.get());
      const nx = clamp(x.get(), scale.get(), width);
      const ny = clamp(y.get(), scale.get(), height);
      x.set(withTiming(nx));
      y.set(withTiming(ny));
      savedX.set(nx);
      savedY.set(ny);
      runOnJS(onZoomChange)(true);
    });

  // Only drags while zoomed, so swiping between photos still works.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .manualActivation(true)
    .onTouchesMove((_e, state) => {
      if (savedScale.get() > 1) state.activate();
      else state.fail();
    })
    .onUpdate((e) => {
      x.set(clamp(savedX.get() + e.translationX, scale.get(), width));
      y.set(clamp(savedY.get() + e.translationY, scale.get(), height));
    })
    .onEnd(() => {
      savedX.set(x.get());
      savedY.set(y.get());
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.get() > 1) {
        reset();
        return;
      }
      scale.set(withTiming(2.5));
      savedScale.set(2.5);
      runOnJS(onZoomChange)(true);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[{ width, height }, styles.center]}>
        <Animated.View style={style}>
          <Image
            source={{ uri }}
            style={{ width, height: height * 0.8 }}
            contentFit="contain"
            cachePolicy="disk"
            accessibilityLabel={label}
            alt={label}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0A08" },
  center: { alignItems: "center", justifyContent: "center" },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  counter: { fontFamily: fonts.sansSemi, fontSize: 14, color: "rgba(255,255,255,0.85)" },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" },
});
