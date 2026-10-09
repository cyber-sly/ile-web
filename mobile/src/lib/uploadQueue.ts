// Upload files one at a time (gentle on weak connections), retrying each a
// few times. Items already uploaded (`done`) are skipped, so publishing again
// after a failure continues where it stopped.
export async function uploadAll<M>(
  items: { key: string; media: M }[],
  upload: (media: M) => Promise<string>,
  { retries = 2, done = {}, onProgress }: { retries?: number; done?: Record<string, string>; onProgress?: (finished: number, total: number) => void } = {}
): Promise<{ urls: Record<string, string>; failed: string[] }> {
  const urls: Record<string, string> = { ...done };
  const failed: string[] = [];
  let finished = items.filter((i) => urls[i.key]).length;
  for (const item of items) {
    if (urls[item.key]) continue;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        urls[item.key] = await upload(item.media);
        break;
      } catch {
        if (attempt === retries) failed.push(item.key);
      }
    }
    finished += 1;
    onProgress?.(finished, items.length);
  }
  return { urls, failed };
}
