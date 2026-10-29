import { useState } from "react";
import type { StyleProp } from "react-native";
import { Image, type ImageStyle } from "expo-image";
import Tap from "@/components/kit/Tap";
import PhotoViewer from "@/components/PhotoViewer";

// A profile photo that opens full screen when tapped (like WhatsApp). Screens
// keep their own initial-letter circle for people without a photo.
export default function ProfilePhoto({ uri, name, style }: { uri: string; name: string; style: StyleProp<ImageStyle> }) {
  const [open, setOpen] = useState(false);
  const label = name ? `${name}'s photo` : "Profile photo";
  return (
    <>
      <Tap accessibilityRole="imagebutton" accessibilityLabel={`View ${label}`} onPress={() => setOpen(true)}>
        <Image source={{ uri }} style={style} cachePolicy="disk" alt="" />
      </Tap>
      <PhotoViewer photos={[uri]} title={name || "Profile photo"} start={open ? 0 : null} onClose={() => setOpen(false)} />
    </>
  );
}
