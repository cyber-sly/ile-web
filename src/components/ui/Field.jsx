import { useId } from "react";

// Labelled form control: visible label, optional hint, error shown under the field.
// Pass `as="textarea"` or `as="select"` (with children options) for other controls.
export default function Field({
  label,
  hint,
  error,
  optional = false,
  as = "input",
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  const id = useId();
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
          } ${Icon ? "pl-10" : ""} ${as === "textarea" ? "resize-y" : ""}`}
          {...props}
        >
          {children}
        </Control>
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
