import { supabase } from "@/lib/supabaseClient";

// Uploads a list of File objects to a Supabase Storage bucket under the
// given user's folder, and returns their public URLs in the same order.
export async function uploadFiles(bucket, userId, files) {
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
  }

  return urls;
}
