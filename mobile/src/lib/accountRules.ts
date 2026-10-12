// Account steps on the phone, kept free of native modules so they can be tested.

// Log out on every device. This phone's notifications stop first; if the
// phone is offline it still logs out here, and says so.
export async function logOutEverywhere(deps: {
  removeToken: () => Promise<void>;
  signOutGlobal: () => Promise<{ error: unknown }>;
  signOutLocal: () => Promise<void>;
}): Promise<{ offline: boolean }> {
  try {
    await deps.removeToken();
  } catch {
    // Offline: removed later (see push.ts syncPush).
  }
  const { error } = await deps.signOutGlobal().catch((e) => ({ error: e }));
  if (!error) return { offline: false };
  await deps.signOutLocal();
  return { offline: true };
}

// Delete the account, then clear this phone. If deletion fails, nothing on
// the phone is touched, so the person can try again.
export async function deleteAccountOnPhone(deps: { deleteAccount: () => Promise<void>; clearDevice: () => Promise<void> }) {
  await deps.deleteAccount();
  try {
    await deps.clearDevice();
  } catch {
    // The account is gone; leftover local data is cleared on next login/out.
  }
}
