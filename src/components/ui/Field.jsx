"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Labelled form control: visible label, optional hint, error shown under the field.
// Pass `as="textarea"` or `as="select"` (with children options) for other controls.
// Password inputs get an eye button to show or hide what's typed.
export default function Field({
  label,
  hint,
  error,
  optional = false,
  as = "input",
  icon: Icon,
  className = "",
  children,
  type,
  ...props
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === "password";
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const Control = as;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-muted">Optional</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-3.5 text-ink-muted"
          />
        )}
        <Control
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-[var(--radius-control)] border bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-muted/70 outline-none transition-shadow focus:border-palm focus:ring-2 focus:ring-palm/25 ${
            error ? "border-clay" : "border-line-strong"
          } ${Icon ? "pl-10" : ""} ${isPassword ? "pr-12" : ""} ${as === "textarea" ? "resize-y" : ""}`}
          type={isPassword && shown ? "text" : type}
          {...props}
        >
          {children}
        </Control>
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[var(--radius-control)] text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-palm"
          >
            {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
