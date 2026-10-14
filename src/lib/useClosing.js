"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Plays an exit animation before unmounting. `closing` drives the CSS
// (data-closing / animate-*-out); `close()` waits `ms`, then calls onClose.
// People who ask for reduced motion skip the wait.
export function useClosing(onClose, ms = 160) {
  const [closing, setClosing] = useState(false);
  const timer = useRef(null);
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  }, [onClose]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const close = useCallback(() => {
    if (timer.current) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (calm) {
      latest.current?.();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setClosing(false); // ready to play again for things that stay mounted (menus)
      latest.current?.();
    }, ms);
  }, [ms]);

  return [closing, close];
}
