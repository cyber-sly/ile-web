import { supabase } from "@/lib/supabaseClient";

// Uploads a list of File objects to a Supabase Storage bucket under the
// given user's folder, and returns their public URLs in the same order.
// onProgress(done, total) fires after each file.
export async function uploadFiles(bucket, userId, files, onProgress) {
  const urls = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

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
