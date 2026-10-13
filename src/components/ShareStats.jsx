import { Rocket } from "lucide-react";
import { seekerProgress, statsLine } from "@/lib/referrals";

// What sharing has brought in, and boost days to spend.
export default function ShareStats({ summary }) {
  if (!summary) return null;
  const { toNext } = seekerProgress(summary.seekers_confirmed);
  return (
    <section className="mb-8 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-palm-soft text-palm">
          <Rocket size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{statsLine(summary)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {toNext} more home-seekers to your next 3 boost days. Your code: <strong className="text-ink">{summary.code}</strong>
          </p>
        </div>
      </div>
    </section>
  );
}
