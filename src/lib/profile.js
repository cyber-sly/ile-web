"use client";

import { supabase } from "@/lib/supabaseClient";
import { checkFiles } from "@/lib/uploadMedia";
import { fetchPeople as fetchPeopleWith, fetchResponseTimes as fetchResponseTimesWith } from "@shared/people.js";

// Display helpers and form choices live in profileDisplay.js (usable on the
// server); re-exported here for convenience.
export * from "@/lib/profileDisplay";

// The signed-in user's full profile, including private fields.
export async function fetchMyProfile() {
  const { data, error } = await supabase.rpc("my_profile");
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function saveProfile(userId, changes) {
  const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
  if (error) throw new Error(error.message);
  // Keep the name on the auth account in sync (used in menus and emails).
  if ("full_name" in changes) await supabase.auth.updateUser({ data: { full_name: changes.full_name } });
}

// Square-crop and shrink a photo to 512px in the browser before upload, so
// avatars are small and fast everywhere.
async function squareThumb(file, size = 512) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext("2d")
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

// Upload a new profile photo and return its public URL. The previous photo
// is removed afterwards.
export async function uploadAvatar(userId, file, previousUrl) {
  const { ok } = await checkFiles([file], "image", 10);
  if (!ok.length) throw new Error("Choose a JPG, PNG, WebP or HEIC photo under 10MB.");
  const blob = await squareThumb(file).catch(() => null);
  if (!blob) throw new Error("We couldn't read that photo. Try a different one.");

  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const marker = "/object/public/avatars/";
  if (previousUrl?.includes(marker)) {
    supabase.storage.from("avatars").remove([decodeURIComponent(previousUrl.split(marker)[1])]).catch(() => {});
  }
  return data.publicUrl;
}

// Public profile basics for many users: { id: { name, avatar } }.
export function fetchPeople(ids) {
  return fetchPeopleWith(supabase, ids);
}

// { id: { occupation, move_in_timeline } } for home-seekers who booked with me.
export async function fetchTenantDetails(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.rpc("tenant_details", { p_ids: unique });
  return Object.fromEntries((data || []).map((r) => [r.id, r]));
}

// { id: minutes } median first-reply time (only listers with enough chats).
export function fetchResponseTimes(ids) {
  return fetchResponseTimesWith(supabase, ids);
}
