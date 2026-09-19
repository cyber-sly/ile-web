import Link from "next/link";
import { Home, Mail, Phone, AtSign, Globe, ArrowUpRight } from "lucide-react";

const linkClass =
  "group inline-flex items-start gap-1.5 text-sm text-white/60 transition-colors duration-200 hover:text-white md:text-base";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/listings", label: "Browse Listings" },
      { href: "/listings/new", label: "Post a Listing" },
      { href: "/signup", label: "Sign Up" },
      { href: "/login", label: "Log In" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-ink text-white">
      {/* Oversized wordmark, purely decorative */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 right-0 select-none font-display text-[16rem] font-bold leading-none text-white/[0.04] md:text-[22rem]"
      >
        Ile.
      </span>

      <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className="group inline-flex items-center gap-2.5 font-display text-2xl font-bold">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-palm shadow-sm shadow-palm/40 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                <Home size={20} strokeWidth={2.4} />
              </span>
              <span>
                Ile<span className="text-sun">.</span>
              </span>
            </Link>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/65">
              Find a home without the wahala. Search, inspect, and move in — no
              upfront fees, no ghost agents.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                aria-label="Social profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-palm hover:bg-palm hover:text-white"
              >
                <AtSign size={18} />
              </a>
              <a
                href="#"
                aria-label="Website"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-palm hover:bg-palm hover:text-white"
              >
                <Globe size={18} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-4 md:col-span-7 md:gap-x-10">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 md:text-xs md:tracking-widest">
                  {col.title}
                </h3>
                <ul className="mt-4 flex flex-col gap-3 md:mt-5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                        <ArrowUpRight
                          size={14}
                          className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-white/40 md:text-xs md:tracking-widest">
                Get in touch
              </h3>
              <ul className="mt-4 flex flex-col gap-3 md:mt-5">
                <li>
                  <a href="mailto:hello@ile.app" className={linkClass}>
                    <Mail size={16} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 break-words">hello@ile.app</span>
                  </a>
                </li>
                <li>
                  <a href="tel:+2348000000000" className={linkClass}>
                    <Phone size={16} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">+234 800 000 0000</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} Ile. All rights reserved.</p>
          <p>Built for Nigerian renters.</p>
        </div>
      </div>
    </footer>
  );
}
