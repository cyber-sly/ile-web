// This phone's push token on the account. Done through database functions so
// a phone that switches accounts moves its token to the new account.

type Client = any;

export async function saveToken(client: Client, token: string, platform: "android" | "ios") {
  const { error } = await client.rpc("register_push_token", { p_token: token, p_platform: platform });
  if (error) throw new Error(error.message);
}

export async function removeToken(client: Client, token: string) {
  await client.rpc("unregister_push_token", { p_token: token });
}

// Log out on this phone: stop its notifications first (the database only lets
// a logged-in person remove their device), then end the session. Logging out
// always happens, even offline.
export async function logOutDevice(
  client: Client,
  storage: { get(): Promise<string | null>; clear(): Promise<void> },
  signOut: () => Promise<unknown>
) {
  try {
    const token = await storage.get();
    if (token) {
      await removeToken(client, token);
      await storage.clear();
    }
  } catch {
    // Offline or already gone: still log out.
  }
  await signOut();
}
