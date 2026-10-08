import { Fraunces, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import Footer from "@/components/Footer";
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, CONTACT_EMAIL } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const DESCRIPTION =
  "Rent or buy homes, land and shops across Nigeria. Prices upfront, free viewings, and no inspection fees.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ile — Find property in Nigeria without the wahala",
    template: "%s · Ile",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_NG",
    title: "Ile — Find property in Nigeria without the wahala",
    description: DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1920, height: 1080, alt: "Ile — property across Nigeria" }],
  },
  twitter: { card: "summary_large_image" },
};

// Who we are, for search engines and AI answers.
const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#org`,
      name: SITE_NAME,
      url: SITE_URL,
      email: CONTACT_EMAIL,
      areaServed: { "@type": "Country", name: "Nigeria" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}#org` },
      inLanguage: "en-NG",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/listings?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const viewport = {
  themeColor: "#F6F1E7",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      {/* Bottom padding keeps the page clear of the phone tab bar. */}
      <body
        className="flex min-h-screen flex-col bg-cream pb-16 font-sans text-ink md:pb-0"
        suppressHydrationWarning
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_SCHEMA) }} />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}
