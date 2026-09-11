import Link from "next/link";
import { Home, Mail, Phone, AtSign, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-mist bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/" className="font-display font-bold text-lg text-palm flex items-center gap-1.5 mb-3">
            <Home size={20} />
            Ile.
          </Link>
          <p className="text-ink/60 text-sm max-w-sm">
            Find a home without the wahala. Search, inspect, and move in — no
            upfront fees, no ghost agents.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 md:gap-8">
          <div>
            <h3 className="font-display font-semibold text-ink mb-3 text-sm md:text-base">Explore</h3>
            <ul className="flex flex-col gap-2 text-xs md:text-sm text-ink/60">
              <li>
                <Link href="/listings" className="hover:text-palm transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link href="/listings/new" className="hover:text-palm transition-colors">
                  Post a Listing
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-palm transition-colors">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-ink mb-3 text-sm md:text-base">Company</h3>
            <ul className="flex flex-col gap-2 text-xs md:text-sm text-ink/60">
              <li>
                <Link href="/about" className="hover:text-palm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-palm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold text-ink mb-3 text-sm md:text-base">Get in touch</h3>
            <ul className="flex flex-col gap-2 text-xs md:text-sm text-ink/60">
              <li className="flex items-center gap-1.5">
                <Mail size={14} className="shrink-0" />
                <span className="truncate">hello@ile.app</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone size={14} className="shrink-0" />
                <span>+234 800 000 0000</span>
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="#" className="text-ink/40 hover:text-palm transition-colors">
                <AtSign size={18} />
              </a>
              <a href="#" className="text-ink/40 hover:text-palm transition-colors">
                <Globe size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-mist py-4 text-center text-sm text-ink/50">
        © {new Date().getFullYear()} Ile. All rights reserved.
      </div>
    </footer>
  );
}