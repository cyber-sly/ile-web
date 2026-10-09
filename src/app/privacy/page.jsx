import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description: "How Ile collects, uses and protects your personal data, and your rights under Nigerian law.",
  alternates: { canonical: "/privacy" },
};

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-palm hover:underline">
    {CONTACT_EMAIL}
  </a>
);

const sections = [
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p><strong>Account details.</strong> Your name, email address, the password you choose (stored only as a secure, irreversible hash that we can never read), and whether you joined to find a place or to list property.</p>
        <p><strong>Profile details you choose to add</strong> (all optional): a profile photo, a short bio, languages you speak, the state you live in, and, for listers, your business name, office address, areas you cover, when you started listing and a professional registration (body and number). Home-seekers can also add their occupation and when they plan to move.</p>
        <p><strong>If you sign in with Google</strong>, Google shares your name, email address and profile picture with us. We never see your Google password.</p>
        <p><strong>Listings you post.</strong> Titles, descriptions, photos, videos, location (state, LGA, area and any street address you enter), prices, fees, property details and who is listing (owner, agent, caretaker or developer).</p>
        <p><strong>Viewings.</strong> The dates and times you request or offer, and the status of each booking.</p>
        <p><strong>Messages</strong> you send to other users through Ile.</p>
        <p><strong>Reviews and reports</strong> you write, including star ratings and comments.</p>
        <p><strong>Technical data.</strong> When you use Ile, our hosting and database providers automatically record things like your IP address, browser type and the time of each request. This is used for security, preventing abuse and keeping the service running.</p>
        <p>We do <strong>not</strong> ask for your phone number, bank details, BVN or NIN.</p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use your data",
    body: (
      <>
        <ul>
          <li>To run your account and let you log in (needed to provide the service you signed up for).</li>
          <li>To show your listings to home-seekers, and to let people book viewings and message each other.</li>
          <li>To keep Ile safe: preventing fraud, fake listings and spam, enforcing rate limits, reviewing reports, and removing content that breaks our Terms (our legitimate interest in a trustworthy marketplace).</li>
          <li>To send you service emails you need, such as password-reset links.</li>
          <li>To meet legal obligations, for example responding to lawful requests from authorities.</li>
        </ul>
        <p>We don&apos;t sell your personal data, and we don&apos;t use it for third-party advertising.</p>
      </>
    ),
  },
  {
    id: "who-can-see",
    title: "What other users can see",
    body: (
      <>
        <ul>
          <li><strong>Listings are public</strong>, including photos, price, location and street address if you add one, and your name as the lister.</li>
          <li><strong>Lister profiles are public</strong>: your name, photo, bio, languages, business name, office address, areas you cover, when you started listing, which professional body you&apos;re registered with (not the number), how quickly you usually reply, your live listings, your average rating and reviews about you.</li>
          <li><strong>Private to you:</strong> the state you live in, your registration number and any phone number. Your occupation and move-in timing are shown only to listers you book a viewing with.</li>
          <li><strong>Reviews of listers are public, but the reviewer stays anonymous.</strong> Reviews of home-seekers are only visible to listers that home-seeker books viewings with.</li>
          <li><strong>Messages</strong> are visible only to the two people in the conversation.</li>
          <li>When you book a viewing, the lister sees your name and the time you chose.</li>
          <li>Your email address and any phone number on your account are never shown to other users.</li>
        </ul>
      </>
    ),
  },
  {
    id: "providers",
    title: "Service providers we use",
    body: (
      <>
        <p>We use a small number of trusted providers to run Ile. They process data only on our instructions:</p>
        <ul>
          <li><strong>Supabase</strong>: our database, sign-in system and photo/video storage.</li>
          <li><strong>Vercel</strong>: hosts the Ile website.</li>
          <li><strong>Google</strong>: only if you choose &ldquo;Continue with Google&rdquo;.</li>
        </ul>
        <p>Some pages show stock photos loaded from Unsplash, and &ldquo;Open in Maps&rdquo; takes you to Google Maps, which handles your data under Google&apos;s own policy.</p>
        <p>These providers may store data on servers outside Nigeria. Where that happens, we rely on their contractual and security commitments to protect it, as the Nigeria Data Protection Act 2023 requires.</p>
      </>
    ),
  },
  {
    id: "browser-storage",
    title: "Cookies and browser storage",
    body: (
      <>
        <p>Ile doesn&apos;t use advertising or analytics cookies. We store a few small items in your browser so the site works:</p>
        <ul>
          <li>Your login session, so you stay signed in. If you untick &ldquo;Keep me logged in&rdquo;, it&apos;s cleared when you close the browser.</li>
          <li>When you last used Ile on that device, so we can sign you out after 30 days of no use.</li>
          <li>Your &ldquo;Keep me logged in&rdquo; choice.</li>
          <li>Homes you&apos;ve saved with the heart button. These stay on your device only.</li>
        </ul>
        <p>You can clear these at any time in your browser settings.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <ul>
          <li>Account details, listings, viewings, messages and reviews are kept while your account is open.</li>
          <li>
            When you delete your account, we delete your profile, login, listings (with their photos and videos),
            viewings and reviews about you. Messages you sent stay visible to the people you chatted with, shown as
            from a &ldquo;Deleted user&rdquo;, and reviews you wrote and reports you made stay without your name. We
            may also keep limited data where needed to resolve disputes, prevent fraud or meet legal obligations.
          </li>
          <li>Reports and moderation records may be kept for up to two years to keep repeat offenders off Ile.</li>
          <li>Technical logs are kept for a short period by our providers, in line with their own policies.</li>
        </ul>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under the Nigeria Data Protection Act 2023 you have the right to:</p>
        <ul>
          <li>ask for a copy of the personal data we hold about you;</li>
          <li>correct data that&apos;s wrong (you can edit most of it yourself in your account and listings);</li>
          <li>ask us to delete your data;</li>
          <li>object to, or ask us to restrict, how we use it;</li>
          <li>receive your data in a portable format;</li>
          <li>withdraw consent where we rely on it.</li>
        </ul>
        <p>
          <strong>You can delete your account yourself</strong> at any time from <strong>Account → Delete account</strong>{" "}
          (<Link href="/delete-account" className="font-semibold text-palm hover:underline">how it works</Link>). For any other
          request, email <Mail /> from the address on your account. We&apos;ll respond within the time the law requires.
        </p>
        <p>If you&apos;re unhappy with how we&apos;ve handled your data, you can complain to the Nigeria Data Protection Commission (NDPC).</p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect your data",
    body: (
      <p>All traffic to Ile is encrypted with HTTPS. Passwords are hashed and never stored in readable form. Access rules in our database make sure each person can only see and change what they&apos;re allowed to. Uploads are checked and limited, and we limit how often actions like sending messages can be repeated. No system is perfectly secure, so please use a strong password that you don&apos;t use anywhere else, and log out on shared computers.</p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: <p>Ile is for people aged 18 and over. We don&apos;t knowingly collect data from anyone younger. If you believe a child has created an account, contact us and we&apos;ll remove it.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: <p>We may update this policy as Ile grows. We&apos;ll change the date at the top, and for significant changes we&apos;ll let you know on the site or by email before they take effect.</p>,
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <p>
        Questions about privacy or your data? Email <Mail />. You can also read our{" "}
        <Link href="/terms" className="font-semibold text-palm hover:underline">Terms of Service</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Ile helps people across Nigeria find, rent and buy property. This policy explains what personal data we
          collect when you use Ile, why we collect it, who can see it, and the rights you have under the Nigeria Data
          Protection Act 2023. We&apos;ve tried to write it in plain language.
        </p>
      }
      sections={sections}
    />
  );
}
