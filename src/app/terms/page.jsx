import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
  description: "The rules for using Ile to list, find, rent and buy property in Nigeria.",
  alternates: { canonical: "/terms" },
};

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-palm hover:underline">
    {CONTACT_EMAIL}
  </a>
);

const sections = [
  {
    id: "using-ile",
    title: "Using Ile",
    body: (
      <p>By creating an account or using Ile, you agree to these Terms and to our{" "}
        <Link href="/privacy" className="font-semibold text-palm hover:underline">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use Ile.</p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 18 years old.</li>
        <li>Give accurate details, and use your own name. One account per person.</li>
        <li>Keep your password safe. You&apos;re responsible for what happens on your account; tell us straight away if you think someone else has used it, and use &ldquo;Log out of all devices&rdquo; in your account settings.</li>
      </ul>
    ),
  },
  {
    id: "our-role",
    title: "What Ile is, and isn't",
    body: (
      <>
        <p>Ile is an online marketplace that connects people looking for property with the owners, agents, caretakers and developers listing it. <strong>Ile is not an estate agent and is not a party to any tenancy, lease or sale.</strong></p>
        <p>We don&apos;t own, inspect, value or guarantee any property, and we don&apos;t check every claim in a listing. Any agreement, payment or handover is strictly between you and the other person. Always view a property in person and confirm ownership and documents (especially the title for land) before you pay anything.</p>
      </>
    ),
  },
  {
    id: "no-fees",
    title: "Free to search, free to view",
    body: (
      <p>Searching, saving, messaging and booking viewings on Ile are free for home-seekers. <strong>Listers must not charge an inspection, viewing or &ldquo;commitment&rdquo; fee for a viewing arranged through Ile</strong>, or ask for any payment before the home-seeker has seen the property in person. Doing so is grounds for removing listings and closing accounts.</p>
    ),
  },
  {
    id: "listings",
    title: "Rules for listings",
    body: (
      <>
        <p>If you list a property, you confirm that:</p>
        <ul>
          <li>you own it, or are authorised by the owner to list it, and you&apos;ve said honestly which (owner, agent, caretaker or developer);</li>
          <li>it exists, is available, and the photos, videos and details are real, recent and of that property;</li>
          <li>the price and every fee (agency, legal, caution, service charge) are accurate and shown upfront, and comply with the law where the property is located, including any legal caps on agency and legal fees;</li>
          <li>you&apos;ll mark it let or sold, or remove it, as soon as it&apos;s no longer available, and confirm it&apos;s still available when we ask;</li>
          <li>it doesn&apos;t discriminate unlawfully or include anything illegal, misleading or offensive;</li>
          <li>you won&apos;t post the same property more than once.</li>
        </ul>
      </>
    ),
  },
  {
    id: "viewings-messages",
    title: "Viewings and messages",
    body: (
      <ul>
        <li>Turn up to viewings you book or confirm, or cancel in good time so the slot can go to someone else.</li>
        <li>Be respectful and honest in messages. Don&apos;t use them for spam, advertising, harassment or to pressure anyone into paying.</li>
        <li>We recommend keeping conversations on Ile, so there&apos;s a record if something goes wrong.</li>
      </ul>
    ),
  },
  {
    id: "reviews",
    title: "Reviews",
    body: (
      <p>Reviews must be honest and based on a viewing that actually happened. Don&apos;t post reviews in exchange for payment or favours, review yourself, or use reviews to threaten anyone. We may remove reviews that are abusive, off-topic, or break these Terms.</p>
    ),
  },
  {
    id: "not-allowed",
    title: "What's not allowed",
    body: (
      <ul>
        <li>Fraud, scams, fake or bait listings, or impersonating someone else.</li>
        <li>Asking for money before a viewing, or collecting deposits for property you can&apos;t let or sell.</li>
        <li>Harassment, threats, hate speech or sharing other people&apos;s personal information.</li>
        <li>Scraping or copying listings in bulk, using bots or automated accounts, or creating accounts to get around a ban.</li>
        <li>Trying to break, overload or get around Ile&apos;s security or limits.</li>
        <li>Anything that breaks Nigerian law.</li>
      </ul>
    ),
  },
  {
    id: "moderation",
    title: "Reports and moderation",
    body: (
      <p>Anyone can report a listing. Listings reported by several people may be hidden automatically while we review them. We may remove listings, reviews or messages, limit features, or suspend or close accounts that break these Terms or put other users at risk, sometimes without warning where safety requires it. If you think we got it wrong, email <Mail /> and we&apos;ll take another look.</p>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <p>You keep ownership of the photos, videos and text you post. You give Ile a non-exclusive, royalty-free licence to host, display, adapt (for example resizing photos) and share that content to run and promote Ile, including in link previews and search results, for as long as it&apos;s on Ile. You confirm you have the right to post it and that it doesn&apos;t infringe anyone else&apos;s rights.</p>
    ),
  },
  {
    id: "paid-features",
    title: "Paid features",
    body: (
      <p>Ile is currently free to use. If we introduce paid features in future, such as promoting a listing or getting a verified badge, we&apos;ll show the price and any extra terms clearly before you pay, and nothing will be charged without your agreement.</p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>Ile is provided &ldquo;as is&rdquo;. We work hard to keep it accurate, safe and available, but we can&apos;t promise it will always be error-free or uninterrupted, or that listings and reviews are complete or accurate. Content is provided by users, not by Ile.</p>
    ),
  },
  {
    id: "liability",
    title: "Limits on our liability",
    body: (
      <p>To the extent Nigerian law allows, Ile isn&apos;t liable for losses arising from dealings between users (including payments, tenancies, sales, or the condition of a property), from content posted by users, or for indirect or consequential losses. Nothing in these Terms limits liability that can&apos;t be limited by law.</p>
    ),
  },
  {
    id: "ending",
    title: "Ending your account",
    body: (
      <p>You can stop using Ile at any time and ask us to delete your account by emailing <Mail />. We may close accounts that break these Terms. Sections that by their nature should continue (such as liability limits and the licence for content already shared) survive after an account is closed.</p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>These Terms are governed by the laws of the Federal Republic of Nigeria. If a dispute arises, please contact us first so we can try to resolve it; otherwise it will be handled by the courts of Nigeria.</p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>We may update these Terms as Ile changes. We&apos;ll update the date at the top, and tell you about significant changes before they take effect. Continuing to use Ile after that means you accept the updated Terms.</p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: <p>Questions about these Terms? Email <Mail />.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These Terms set out the rules for using Ile to search for, list, view, rent and buy property in Nigeria.
          They&apos;re here to keep Ile fair and safe for home-seekers and listers alike.
        </p>
      }
      sections={sections}
    />
  );
}
