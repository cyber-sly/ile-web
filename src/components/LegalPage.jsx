import Link from "next/link";
import { LEGAL_UPDATED } from "@/lib/site";

// Shared layout for the Privacy Policy and Terms: readable measure, numbered
// sections with anchors, and a contents list.
export default function LegalPage({ title, intro, sections }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-palm">Legal</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated {LEGAL_UPDATED}</p>
      <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85">{intro}</div>

      <nav aria-label="Contents" className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink">Contents</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-palm hover:underline">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="font-serif text-2xl font-semibold text-ink">
              {i + 1}. {s.title}
            </h2>
            <div className="legal-body mt-3 space-y-3 text-[16px] leading-relaxed text-ink/85 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5 [&_strong]:text-ink">
              {s.body}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-14 border-t border-line pt-6 text-sm text-ink-muted">
        See also our{" "}
        <Link href="/privacy" className="font-semibold text-palm hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="font-semibold text-palm hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}
