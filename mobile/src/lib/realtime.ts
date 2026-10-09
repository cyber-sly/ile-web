// Realtime returns an existing channel for a repeated name, and adding
// listeners to a joined channel throws, so every screen gets its own name.
let counter = 0;

export function uniqueTopic(base: string): string {
  counter += 1;
  return `${base}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}
