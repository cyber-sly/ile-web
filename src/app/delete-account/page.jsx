import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import { button } from "@/components/ui/Button";

export const metadata = {
  title: "Delete your account",
  description: "How to delete your Ile account and what happens to your data.",
  alternates: { canonical: "/delete-account" },
};

// Public instructions for deleting an account. App stores (Google Play in
// particular) require a web page like this, reachable without the app.
export default function DeleteAccountInfoPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 md:py-14">
      <p className="text-sm font-semibold uppercase tracking-wider text-palm">Account</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">Delete your Ile account</h1>

      <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <h2 className="font-serif text-xl font-semibold text-ink">How to delete it</h2>
        <ol className="mt-3 ml-5 list-decimal space-y-1.5 text-ink/85">
          <li>Log in to Ile on the website or in the app.</li>
          <li>Open <strong>Account</strong>.</li>
          <li>Scroll to <strong>Delete account</strong> and tap <strong>Delete my account</strong>.</li>
          <li>Confirm with your password (or type DELETE if you signed up with Google).</li>
        </ol>
        <p className="mt-3 text-ink/85">Your account is deleted straight away.</p>
        <Link href="/login?next=/account" className={button({ className: "mt-5" })}>
          Log in to delete your account
        </Link>
      </section>

      <section className="mt-6 space-y-3 text-ink/85">
        <h2 className="font-serif text-xl font-semibold text-ink">What&apos;s deleted</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Your profile, email address and login</li>
          <li>All your listings, with their photos and videos</li>
          <li>Viewings on your listings, and viewings you booked</li>
          <li>Reviews other people wrote about you</li>
        </ul>
        <h2 className="pt-3 font-serif text-xl font-semibold text-ink">What&apos;s kept, without your name</h2>
        <ul className="ml-5 list-disc space-y-1">
          <li>Messages you sent, so the people you chatted with keep their conversation history. You&apos;re shown as &ldquo;Deleted user&rdquo;.</li>
          <li>Reviews you wrote about others, which were already anonymous.</li>
          <li>Reports you made about listings, so moderation records stay complete.</li>
        </ul>
        <p className="pt-3">
          Can&apos;t log in? Email <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-palm hover:underline">{CONTACT_EMAIL}</a> from
          the address on your account and we&apos;ll delete it for you. See our{" "}
          <Link href="/privacy" className="font-semibold text-palm hover:underline">Privacy Policy</Link> for more.
        </p>
      </section>
    </div>
  );
}
