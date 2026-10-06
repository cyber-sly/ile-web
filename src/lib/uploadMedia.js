import { supabase } from "@/lib/supabaseClient";

// What listers may upload. Storage enforces the same types and sizes on the
// server (supabase/hardening.sql); checking here gives instant, friendly
// errors. SVG is excluded on purpose: it can contain scripts.
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};
export const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");
export const VIDEO_ACCEPT = Object.keys(VIDEO_TYPES).join(",");

// Look at the file's first bytes rather than trusting its name or the type
// the browser reports, so a renamed file can't pass as a photo.
async function sniff(file) {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (["heic", "heix", "hevc", "heim", "heis"].includes(brand)) return "image/heic";
    if (["mif1", "msf1"].includes(brand)) return "image/heif";
    if (brand.startsWith("qt")) return "video/quicktime";
    return "video/mp4"; // isom, mp41, mp42, avc1, M4V, 3gp...
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  return null;
}

// Split picked files into accepted and rejected (with a reason).
// `kind` is "image" or "video".
export async function checkFiles(files, kind, maxMb) {
  const types = kind === "image" ? IMAGE_TYPES : VIDEO_TYPES;
  const ok = [];
  const rejected = [];
  for (const file of files) {
    const real = await sniff(file);
    if (!real || !types[real]) {
      rejected.push({ file, reason: "type" });
    } else if (file.size > maxMb * 1024 * 1024) {
      rejected.push({ file, reason: "size" });
    } else {
      ok.push(Object.assign(file, { verifiedType: real }));
    }
  }
  return { ok, rejected };
}

// Uploads files to a Supabase Storage bucket under the user's folder and
// returns their public URLs in the same order. The stored name and content
// type come from the verified file type, never from the user's filename.
// onProgress(done, total) fires after each file.
export async function uploadFiles(bucket, userId, files, onProgress) {
  const urls = [];

  for (const file of files) {
    const type = file.verifiedType || file.type;
    const ext = IMAGE_TYPES[type] || VIDEO_TYPES[type];
    if (!ext) throw new Error(`${file.name} isn't a supported photo or video format.`);
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { contentType: type, upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    urls.push(publicUrlData.publicUrl);
    onProgress?.(urls.length, files.length);
  }

  return urls;
}

// Best-effort removal of files by their public URL, e.g. photos taken off a
// listing. Failures are ignored: a leftover file is harmless, a failed save isn't.
export async function removeFiles(bucket, publicUrls) {
  const marker = `/object/public/${bucket}/`;
  const paths = publicUrls
    .map((url) => {
      const i = url.indexOf(marker);
      return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
    })
    .filter(Boolean);
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(paths);
  } catch {}
}
