// Profile photo rules, kept free of native modules so they can be tested.

// The centre square of a photo (portrait or landscape).
export function avatarTarget(width: number, height: number) {
  const side = Math.min(width, height);
  return { originX: Math.round((width - side) / 2), originY: Math.round((height - side) / 2), width: side, height: side };
}

// Upload the new photo, save it on the profile, and only then delete the old
// one. If saving fails, the old photo stays and the new upload is removed.
export async function replaceAvatar(
  deps: { upload: (uri: string) => Promise<string>; save: (url: string | null) => Promise<void>; remove: (url: string) => Promise<void> },
  uri: string,
  previousUrl: string | null
): Promise<string> {
  const url = await deps.upload(uri);
  try {
    await deps.save(url);
  } catch (e) {
    await deps.remove(url).catch(() => {});
    throw e;
  }
  if (previousUrl) await deps.remove(previousUrl).catch(() => {});
  return url;
}
