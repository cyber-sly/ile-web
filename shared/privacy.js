// Usernames and private phone numbers (functions in supabase/profiles_privacy.sql).
// Each takes a Supabase client first.
import { normalizeUsername, usernameError } from "./people.js";


// true / false, or null when the database can't check yet (SQL not run).
export async function usernameAvailable(client, name) {
  if (usernameError(name)) return false;
  try {
    const { data, error } = await client.rpc("username_available", { p_username: normalizeUsername(name) });
    if (error) return null; // e.g. the function is missing until the SQL is run
    return Boolean(data);
  } catch {
    return null;
  }
}

// The signed-in person's own phone number (or null).
export async function fetchMyPhone(client) {
  try {
    const { data, error } = await client.rpc("my_phone");
    return error ? null : data || null;
  } catch {
    return null;
  }
}

// The other person's phone on a confirmed viewing or accepted stay, or null.
export async function fetchBookingContact(client, kind, id) {
  try {
    const { data, error } = await client.rpc("booking_contact", { p_kind: kind, p_id: id });
    return error ? null : data || null;
  } catch {
    return null;
  }
}
