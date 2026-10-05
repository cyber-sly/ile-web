"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, isLandlord, loginHref } from "@/lib/useUser";
import { Home, Search, Heart, CalendarDays, LayoutDashboard, UserRound } from "lucide-react";

// Phone-only bottom navigation: thumb-reachable, five tabs at most.
export default function MobileTabBar() {
  const pathname = usePathname();
  const user = useUser();
  const landlord = isLandlord(user);

  const tabs = [
    { href: "/", label: "Home", icon: Home, exact: true },
    { href: "/listings", label: "Search", icon: Search },
    { href: "/saved", label: "Saved", icon: Heart },
    landlord
      ? { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
      : { href: "/my-bookings", label: "Viewings", icon: CalendarDays },
    user
      ? { href: "/account", label: "Account", icon: UserRound }
      : { href: loginHref(pathname), label: "Log in", icon: UserRound, match: "/login" },
  ];

  const isActive = (t) => {
    const target = t.match || t.href;
    if (t.exact) return pathname === target;
    // /listings/new belongs to the lister flow, not Search.
    if (target === "/listings" && pathname.startsWith("/listings/new")) return false;
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const on = isActive(t);
          const Icon = t.icon;
          return (
            <li key={t.label}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  on ? "text-palm" : "text-ink-muted"
                }`}
              >
                <Icon size={22} strokeWidth={on ? 2.4 : 1.9} aria-hidden="true" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
