import { useEffect, useRef, useState } from "react";

// The search box's text. Typing applies `q` after a 400 ms pause; a `q` that
// changes from elsewhere (restored last search, Clear) fills the box instead
// of being overwritten by it.
export function useSearchText(q: string, change: (changes: { q: string }) => void): [string, (text: string) => void] {
  const [text, setText] = useState(q);
  const synced = useRef(q);

  useEffect(() => {
    if (q !== synced.current) {
      synced.current = q;
      setText(q);
    }
  }, [q]);

  useEffect(() => {
    if (text === synced.current) return;
    const t = setTimeout(() => {
      synced.current = text;
      change({ q: text });
    }, 400);
    return () => clearTimeout(t);
  }, [text, change]);

  return [text, setText];
}
