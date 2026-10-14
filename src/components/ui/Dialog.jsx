"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useClosing } from "@/lib/useClosing";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal used by every pop-up: a bottom sheet on phones, a centred card on
// larger screens. Handles Escape, outside taps, focus (kept inside, then
// returned to whatever opened it), page scroll lock and the exit animation.
// `children` may be a function receiving close(), so buttons inside can close
// it with the animation.
export default function Dialog({ title, description, onClose, children, role = "dialog", initialFocus, hideClose = false }) {
  const [closing, close] = useClosing(onClose);
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const first = (initialFocus && panel?.querySelector(initialFocus)) || panel?.querySelector(FOCUSABLE) || panel;
    first?.focus();

    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener instanceof HTMLElement) opener.focus();
    };
    // Runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 sm:items-center sm:p-6 ${
        closing ? "animate-fade-out" : "animate-fade-in"
      }`}
      onClick={close}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        data-closing={closing || undefined}
        onClick={(e) => e.stopPropagation()}
        className="dialog-panel max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-hero)] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-float)] outline-none sm:rounded-[var(--radius-hero)] sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-serif text-2xl font-semibold text-ink">
            {title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        {description && (
          <p id={descId} className="mt-1 text-ink-muted">
            {description}
          </p>
        )}
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>,
    document.body
  );
}
