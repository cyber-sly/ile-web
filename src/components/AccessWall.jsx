import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

// Shown when a page needs a signed-in (or lister) account the visitor doesn't have.
export default function AccessWall({ title, children, primary, secondary }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={Lock}
        title={title}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {primary && (
              <Link href={primary.href} className={button()}>
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className={button({ variant: "neutral" })}>
                {secondary.label}
              </Link>
            )}
          </div>
        }
      >
        {children}
      </EmptyState>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10" aria-hidden="true">
      <div className="skeleton h-10 w-1/2 rounded" />
      <div className="skeleton mt-6 h-64 rounded-[var(--radius-card)]" />
      <div className="skeleton mt-5 h-40 rounded-[var(--radius-card)]" />
    </div>
  );
}
