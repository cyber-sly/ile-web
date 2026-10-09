import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";
import { supabase } from "./supabase";
import { PHOTO_QUALITY, resizeTarget, storagePath, VIDEO_TYPES, videoProblem } from "./mediaRules";

// A photo or video picked for a listing, kept in the app's own storage until
// it's uploaded (the picker's temporary files can vanish if the app closes).
export type LocalMedia = { id: string; uri: string; kind: "image" | "video"; mime: string };

const DRAFTS = new Directory(Paths.document, "drafts");

function keepFile(uri: string, ext: string): string {
  if (!DRAFTS.exists) DRAFTS.create({ idempotent: true, intermediates: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const target = new File(DRAFTS, name);
  new File(uri).copySync(target);
  return target.uri;
}

async function preparePhoto(asset: ImagePicker.ImagePickerAsset): Promise<LocalMedia> {
  const context = ImageManipulator.manipulate(asset.uri);
  const target = resizeTarget(asset.width || 0, asset.height || 0);
  if (target) context.resize(target);
  const image = await context.renderAsync();
  // Always JPEG: smaller, and iPhone HEIC photos become a format every browser shows.
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  const uri = keepFile(saved.uri, "jpg");
  return { id: uri, uri, kind: "image", mime: "image/jpeg" };
}

export async function pickPhotos(room: number): Promise<LocalMedia[]> {
  if (room <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: room,
    quality: 1,
  });
  if (result.canceled) return [];
  const out: LocalMedia[] = [];
  for (const asset of result.assets.slice(0, room)) out.push(await preparePhoto(asset));
  return out;
}

export async function takePhoto(): Promise<LocalMedia | "denied" | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return "denied";
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 });
  if (result.canceled || !result.assets[0]) return null;
  return preparePhoto(result.assets[0]);
}

// Videos aren't re-encoded; ones over the limit are refused with a reason.
export async function pickVideos(room: number): Promise<{ media: LocalMedia[]; problem: string | null }> {
  if (room <= 0) return { media: [], problem: null };
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsMultipleSelection: true, selectionLimit: room });
  if (result.canceled) return { media: [], problem: null };
  const media: LocalMedia[] = [];
  let problem: string | null = null;
  for (const asset of result.assets.slice(0, room)) {
    const mime = asset.mimeType || (asset.uri.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4");
    const size = asset.fileSize ?? new File(asset.uri).size ?? 0;
    const issue = videoProblem({ size, mime });
    if (issue) {
      problem = issue;
      continue;
    }
    const uri = keepFile(asset.uri, VIDEO_TYPES[mime]);
    media.push({ id: uri, uri, kind: "video", mime });
  }
  return { media, problem };
}

// Upload one file to the listing's storage bucket; returns its public URL.
export async function uploadOne(media: LocalMedia, userId: string): Promise<string> {
  const bucket = media.kind === "image" ? "listing-images" : "listing-videos";
  const ext = media.kind === "image" ? "jpg" : VIDEO_TYPES[media.mime] || "mp4";
  const path = storagePath(userId, ext);
  const bytes = await new File(media.uri).bytes();
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: media.mime, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// Best-effort removal of saved photos taken off a listing (by public URL).
export async function removeUploaded(bucket: "listing-images" | "listing-videos", urls: string[]) {
  const marker = `/object/public/${bucket}/`;
  const paths = urls.map((u) => (u.includes(marker) ? decodeURIComponent(u.split(marker)[1]) : null)).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(paths);
  } catch {}
}

// Delete local copies once a listing is published or the draft is thrown away.
export function forgetLocal(media: LocalMedia[]) {
  for (const m of media) {
    try {
      const f = new File(m.uri);
      if (f.exists) f.delete();
    } catch {}
  }
}
