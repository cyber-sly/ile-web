"use client";

import { supabase } from "@/lib/supabaseClient";

const MEDIA_BUCKETS = ["listing-images", "listing-videos"];

// Every file in a user's folder (<user id>/...) in one bucket.
async function listUserFiles(bucket, userId) {
  const paths = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100, offset });
    if (error) throw new Error(error.message);
    paths.push(...(data || []).filter((f) => f.id).map((f) => `${userId}/${f.name}`));
    if (!data || data.length < 100) return paths;
  }
}

// Permanently delete the signed-in user's account.
// 1. Remove their photos and videos (Storage files can only be removed
//    through the Storage API, not by the database).
// 2. Delete the account; the database rules in supabase/account_deletion.sql
//    decide what's removed and what's kept (chats, anonymous reviews).
// 3. Clear this device.
export async function deleteMyAccount(userId) {
  // Make sure deletion will work before removing anything.
  const { data: ready, error: readyError } = await supabase.rpc("account_deletion_ready");
  if (readyError || !ready) {
    throw new Error("Account deletion isn't available right now. Nothing was deleted. Please try again later.");
  }

  for (const bucket of MEDIA_BUCKETS) {
    const paths = await listUserFiles(bucket, userId);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw new Error(`Couldn't remove your photos: ${error.message}`);
    }
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error.message);

  // The server session is already gone; clear what's left on this device.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  try {
    localStorage.removeItem("ile:saved-listings");
    localStorage.removeItem("ile:last-active");
  } catch {}
}

// Email/password accounts confirm with their password; Google-only accounts
// (no password) confirm by typing DELETE.
export function hasPassword(user) {
  return (user?.identities || []).some((i) => i.provider === "email");
}

// Re-check the password without changing the current session.
export async function verifyPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}
