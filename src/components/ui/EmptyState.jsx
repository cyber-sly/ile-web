// Friendly placeholder for empty lists, missing pages and access walls.
export default function EmptyState({ icon: Icon, title, children, action, tone = "palm" }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      {Icon && (
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            tone === "clay" ? "bg-clay-soft text-clay" : "bg-palm-soft text-palm"
          }`}
        >
          <Icon size={26} aria-hidden="true" />
        </span>
      )}
      <div className="max-w-md">
        <p className="font-serif text-xl font-semibold text-ink">{title}</p>
        {children && <div className="mt-1.5 text-ink-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}
