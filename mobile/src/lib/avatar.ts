import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { saveProfile } from "@shared/account.js";
import { supabase } from "./supabase";
import { avatarTarget, replaceAvatar } from "./avatarRules";

const AVATAR_SIZE = 512;

// Take or choose a photo, crop the centre square and shrink it to 512 px.
export async function pickAvatar(source: "camera" | "library"): Promise<string | "denied" | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return "denied";
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width && asset.height) context.crop(avatarTarget(asset.width, asset.height));
  context.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return saved.uri;
}

async function upload(userId: string, uri: string): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const bytes = await new File(uri).bytes();
  const { error } = await supabase.storage.from("avatars").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

async function remove(url: string) {
  const marker = "/object/public/avatars/";
  if (!url.includes(marker)) return;
  await supabase.storage.from("avatars").remove([decodeURIComponent(url.split(marker)[1])]);
}

// New profile photo: the old one is deleted only after the profile saves.
export function changeAvatar(userId: string, uri: string, previousUrl: string | null) {
  return replaceAvatar(
    { upload: (u) => upload(userId, u), save: (url) => saveProfile(supabase, userId, { avatar_url: url }), remove },
    uri,
    previousUrl
  );
}

export async function removeAvatar(userId: string, previousUrl: string | null) {
  await saveProfile(supabase, userId, { avatar_url: null });
  if (previousUrl) await remove(previousUrl).catch(() => {});
}
