"use client";

import { supabase } from "@/lib/supabaseClient";

import {
  deleteMyAccount as deleteMyAccountWith,
  verifyPassword as verifyPasswordWith,
} from "@shared/account.js";

export { hasPassword } from "@shared/account.js";

// Permanently delete the signed-in user's account (rules in shared/account.js),
// then clear this browser.
export async function deleteMyAccount(userId) {
  await deleteMyAccountWith(supabase, userId);
  try {
    localStorage.removeItem("ile:saved-listings");
    localStorage.removeItem("ile:last-active");
  } catch {}
}

// Re-check the password without changing the current session.
export function verifyPassword(email, password) {
  return verifyPasswordWith(supabase, email, password);
}
