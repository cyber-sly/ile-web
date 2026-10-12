// This phone's push token on the account. Done through database functions so
// a phone that switches accounts moves its token to the new account, and a
// phone can stop its notifications even after its session ended (the token
// itself is the proof).

type Client = any;
type TokenStorage = { get(): Promise<string | null>; clear(): Promise<void> };

export async function saveToken(client: Client, token: string, platform: "android" | "ios") {
  const { error } = await client.rpc("register_push_token", { p_token: token, p_platform: platform });
  if (error) throw new Error(error.message);
}

// supabase-js resolves with { error } when offline, so check it.
export async function removeToken(client: Client, token: string) {
  const { error } = await client.rpc("unregister_push_token", { p_token: token });
  if (error) throw new Error(error.message);
}

// If an earlier removal didn't reach the server, try again. The token stays
// stored until it's really gone.
export async function forgetPendingToken(client: Client, storage: TokenStorage) {
  const token = await storage.get();
  if (!token) return;
  await removeToken(client, token);
  await storage.clear();
}

// Log out on this phone: stop its notifications first, then end the session.
// Logging out always happens, even offline; a removal that fails is retried
// the next time the app starts with nobody logged in.
export async function logOutDevice(client: Client, storage: TokenStorage, signOut: () => Promise<unknown>) {
  try {
    await forgetPendingToken(client, storage);
  } catch {
    // Offline: the token stays stored and is removed later.
  }
  await signOut();
}
