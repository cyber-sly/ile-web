// Same rule as the website: a device unused for this many days must sign in again.
export const INACTIVE_DAYS = 30;

export function isInactive(lastActiveMs: number | null, nowMs: number, days: number = INACTIVE_DAYS): boolean {
  if (!lastActiveMs) return false;
  return nowMs - lastActiveMs > days * 86_400_000;
}
