import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { button } from "@/components/ui/Button";
import { SearchX } from "lucide-react";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that page"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/listings" className={button()}>
              Browse listings
            </Link>
            <Link href="/" className={button({ variant: "neutral" })}>
              Go home
            </Link>
          </div>
        }
      >
        The listing may have been removed by the lister, or the link may be mistyped.
      </EmptyState>
    </div>
  );
}
