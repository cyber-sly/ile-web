"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Home, Search, PlusCircle, LayoutDashboard, Bookmark, LogOut, Menu, X,
} from "lucide-react";

const linkBase =
  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  // Remember which page the menu was opened on, so it closes itself on navigation.
  const [menuOpenAt, setMenuOpenAt] = useState(null);
  const menuOpen = menuOpenAt === pathname;

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }

    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8); // bails out unless it flips
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setMenuOpenAt(null);
    router.push("/");
    router.refresh();
  }

  const isLandlord = user?.user_metadata?.role === "landlord";
  const links = [
    { href: "/listings", label: "Listings", icon: Search },
    ...(user && isLandlord
      ? [
          { href: "/listings/new", label: "Post a Listing", icon: PlusCircle },
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ]
      : []),
    ...(user ? [{ href: "/my-bookings", label: "My Bookings", icon: Bookmark }] : []),
  ];

  // Longest matching link wins, so /listings/new highlights "Post a Listing" only.
  const activeHref = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const isActive = (href) => href === activeHref;

  const linkClass = (href) =>
    `${linkBase} ${
      isActive(href)
        ? "bg-palm/10 text-palm"
        : "text-ink/70 hover:bg-ink/5 hover:text-ink"
    }`;

  const initial = (user?.user_metadata?.full_name || user?.email || "?").trim()[0]?.toUpperCase();

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 backdrop-blur-xl ${
        scrolled
          ? "bg-white/85 border-mist shadow-[0_6px_24px_-12px_rgba(28,27,24,0.25)]"
          : "bg-white/60 border-transparent"
      }`}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6"
      >
        <Link
          href="/"
          className="group mr-2 flex items-center gap-2.5 rounded-full py-1 pr-2 font-display text-xl font-bold text-ink"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-palm text-white shadow-sm shadow-palm/30 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <Home size={18} strokeWidth={2.4} />
          </span>
          <span>
            Ile<span className="text-palm">.</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={linkClass(href)}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="ml-auto hidden md:flex items-center gap-2">
          {user ? (
            <>
              <span
                title={user.email}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-palm/10 text-sm font-semibold text-palm ring-1 ring-palm/20"
              >
                {initial}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-clay transition-colors hover:bg-clay/10"
              >
                <LogOut size={16} /> Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${linkBase} text-ink/70 hover:bg-ink/5 hover:text-ink`}>
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-palm px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-palm/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-palm-dark hover:shadow-md hover:shadow-palm/30"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpenAt(menuOpen ? null : pathname)}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 md:hidden"
        >
          <span className="relative h-5 w-5">
            <Menu
              size={20}
              className={`absolute inset-0 transition-all duration-300 ${
                menuOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              size={20}
              className={`absolute inset-0 transition-all duration-300 ${
                menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Mobile menu: height animates via grid rows, so no measuring needed */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={`grid transition-[grid-template-rows] duration-300 ease-out md:hidden ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`flex flex-col gap-1 border-t border-mist px-4 pb-4 pt-3 transition-opacity duration-300 ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`${linkClass(href)} !py-3 !text-base`}
              >
                <Icon size={18} /> {label}
              </Link>
            ))}

            {user ? (
              <button
                onClick={handleLogout}
                className={`${linkBase} !py-3 !text-base text-clay hover:bg-clay/10`}
              >
                <LogOut size={18} /> Log Out
              </button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-full border border-mist py-3 text-center font-medium text-ink transition-colors hover:bg-ink/5"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-palm py-3 text-center font-semibold text-white transition-colors hover:bg-palm-dark"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
