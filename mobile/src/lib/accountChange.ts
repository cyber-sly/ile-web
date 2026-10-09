// True when someone was logged in and now a different account (or nobody)
// is: their cached data and waiting messages must not carry over.
export function accountChanged(previous: string | null, next: string | null): boolean {
  return previous !== null && previous !== next;
}
