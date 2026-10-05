export default function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface" aria-hidden="true">
      <div className="skeleton aspect-[4/3] w-full" />
      <div className="p-4">
        <div className="skeleton h-5 w-1/2 rounded" />
        <div className="skeleton mt-2 h-4 w-3/4 rounded" />
        <div className="skeleton mt-2 h-4 w-1/3 rounded" />
        <div className="skeleton mt-4 h-4 w-16 rounded" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6, className = "" }) {
  return (
    <div className={className} role="status" aria-label="Loading listings">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
