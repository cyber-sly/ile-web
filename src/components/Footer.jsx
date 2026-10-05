import Link from "next/link";
import Logo from "@/components/Logo";
import { Mail } from "lucide-react";

const columns = [
  {
    title: "Find property",
    links: [
      { href: "/listings?type=rent", label: "Homes for rent" },
      { href: "/listings?type=sale", label: "Property for sale" },
      { href: "/saved", label: "Saved homes" },
    ],
  },
  {
    title: "List with Ile",
    links: [
      { href: "/signup?role=landlord&next=/listings/new", label: "List a property" },
      { href: "/dashboard", label: "Lister dashboard" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Create account" },
      { href: "/my-bookings", label: "My viewings" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs font-serif text-lg leading-snug text-ink">
              Find your place in Nigeria, <em>without the wahala.</em>
            </p>
            <a
              href="mailto:hello@ile.app"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-palm hover:underline"
            >
              <Mail size={16} aria-hidden="true" /> hello@ile.app
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-ink transition-colors hover:text-palm">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-sm text-ink-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Ile. All rights reserved.</p>
          <p>Free to search. Free viewings. No inspection fees.</p>
        </div>
      </div>
    </footer>
  );
}
