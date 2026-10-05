import { Fraunces, Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import MobileTabBar from "@/components/MobileTabBar";
import Footer from "@/components/Footer";
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

export const metadata = {
  title: {
    default: "Ile — Find property in Nigeria without the wahala",
    template: "%s · Ile",
  },
  description:
    "Rent or buy homes, land and shops across Nigeria. Verified listings, free viewings, and no inspection fees.",
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
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <MobileTabBar />
      </body>
    </html>
  );
}
