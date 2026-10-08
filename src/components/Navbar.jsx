"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser, isLandlord, loginHref, useIsAdmin } from "@/lib/useUser";
import { useUnreadCount } from "@/lib/messaging";
import { button } from "@/components/ui/Button";
import Logo from "@/components/Logo";
import { Plus, Heart, CalendarDays, LayoutDashboard, LogOut, ChevronDown, UserRound, MessageCircle, ShieldCheck } from "lucide-react";

const navLink =
  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();
  const landlord = isLandlord(user);
  const unread = useUnreadCount(user);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    // This device only; "Log out of all devices" lives on the Account page.
    await supabase.auth.signOut({ scope: "local" });
    router.push("/");
    router.refresh();
  }

  const active = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (href) =>
    `${navLink} ${active(href) ? "bg-palm-soft text-palm" : "text-ink-muted hover:bg-ink/5 hover:text-ink"}`;

  // Anyone can list. Signed-out visitors go through signup first, then land on the form.
  const listHref = user ? "/listings/new" : "/signup?role=landlord&next=/listings/new";

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-surface/90 backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${
        scrolled ? "border-line shadow-[0_8px_24px_-18px_rgba(30,27,22,0.4)]" : "border-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Logo className="mr-4" />

        <div className="hidden items-center gap-1 md:flex">
          <Link href="/listings?type=rent" className={`${navLink} text-ink-muted hover:bg-ink/5 hover:text-ink`}>
            Rent
          </Link>
          <Link href="/listings?type=sale" className={`${navLink} text-ink-muted hover:bg-ink/5 hover:text-ink`}>
            Buy
          </Link>
          <Link href="/saved" className={linkClass("/saved")}>
            Saved
          </Link>
          {user && !landlord && (
            <Link href="/my-bookings" className={linkClass("/my-bookings")}>
              My viewings
            </Link>
          )}
          {landlord && (
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Dashboard
            </Link>
          )}
          {user && (
            <Link href="/messages" className={`${linkClass("/messages")} relative`}>
              Messages
              {unread > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[11px] font-bold text-white">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              )}
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user === null && (
            <Link
              href={loginHref(pathname)}
              className={`${navLink} hidden text-ink-muted hover:bg-ink/5 hover:text-ink sm:inline-flex`}
            >
              Log in
            </Link>
          )}
          <Link href={listHref} className={button({ variant: "secondary", size: "sm", className: "rounded-full" })}>
            <Plus size={16} aria-hidden="true" /> <span>List property</span>
          </Link>
          {user && <AccountMenu user={user} landlord={landlord} onLogout={handleLogout} />}
        </div>
      </nav>
    </header>
  );
}

function AccountMenu({ user, landlord, onLogout }) {
  const admin = useIsAdmin(user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const name = user.user_metadata?.full_name || user.email;
  const initial = (name || "?").trim()[0]?.toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-ink/5";

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex h-10 items-center gap-1 rounded-full border border-line bg-surface pl-1 pr-2 transition-colors hover:border-line-strong"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-palm text-sm font-semibold text-white">
          {initial}
        </span>
        <ChevronDown size={15} className="text-ink-muted" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute right-0 mt-2 w-64 rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-[var(--shadow-float)]"
        >
          <div className="border-b border-line px-3 pb-3 pt-2">
            <p className="truncate font-semibold text-ink">{name}</p>
            <p className="text-xs text-ink-muted">{landlord ? "Lister account" : "Home-seeker account"}</p>
          </div>
          <div className="pt-2" onClick={() => setOpen(false)}>
            <Link role="menuitem" href="/account" className={item}>
              <UserRound size={16} aria-hidden="true" /> Account
            </Link>
            <Link role="menuitem" href="/messages" className={item}>
              <MessageCircle size={16} aria-hidden="true" /> Messages
            </Link>
            <Link role="menuitem" href="/saved" className={item}>
              <Heart size={16} aria-hidden="true" /> Saved homes
            </Link>
            <Link role="menuitem" href="/my-bookings" className={item}>
              <CalendarDays size={16} aria-hidden="true" /> My viewings
            </Link>
            <Link role="menuitem" href="/dashboard" className={item}>
              <LayoutDashboard size={16} aria-hidden="true" /> My listings
            </Link>
            {admin && (
              <Link role="menuitem" href="/admin" className={item}>
                <ShieldCheck size={16} aria-hidden="true" /> Moderation
              </Link>
            )}
            <button role="menuitem" type="button" onClick={onLogout} className={`${item} w-full text-clay`}>
              <LogOut size={16} aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
