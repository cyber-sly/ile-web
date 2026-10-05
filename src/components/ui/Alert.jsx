import { AlertCircle, CheckCircle2 } from "lucide-react";

// Inline feedback message for form results and failed actions.
export default function Alert({ tone = "error", children, className = "" }) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-[var(--radius-control)] px-3.5 py-3 text-sm font-medium ${
        isError ? "bg-clay-soft text-clay" : "bg-palm-soft text-palm"
      } ${className}`}
    >
      <Icon size={17} className="mt-px shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
