"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useToasts, dismissToast } from "@/lib/toast";

const TONES = {
  success: { icon: CheckCircle2, className: "text-palm" },
  error: { icon: CircleAlert, className: "text-clay" },
  info: { icon: Info, className: "text-ink-muted" },
};

// Sits above the phone tab bar; screen readers hear each message once.
export default function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => {
        const { icon: Icon, className } = TONES[t.tone] || TONES.info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-line bg-surface py-2 pl-4 pr-1.5 text-sm font-semibold text-ink shadow-[var(--shadow-float)] ${
              t.leaving ? "toast-out" : "toast-in"
            }`}
          >
            <Icon size={18} className={`shrink-0 ${className}`} aria-hidden="true" />
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
