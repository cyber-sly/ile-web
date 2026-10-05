"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser, isLandlord, useIsAdmin } from "@/lib/useUser";
import EmptyState from "@/components/ui/EmptyState";
import { button } from "@/components/ui/Button";
import { Heart, CalendarDays, LayoutDashboard, Plus, LogOut, UserRound, ChevronRight, ShieldCheck } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const user = useUser();
  const admin = useIsAdmin(user);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (user === undefined) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12" aria-hidden="true">
        <div className="skeleton h-28 rounded-[var(--radius-card)]" />
        <div className="skeleton mt-4 h-60 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          icon={UserRound}
          title="You're not logged in"
          action={
            <Link href="/login?next=/account" className={button()}>
              Log in
            </Link>
          }
        >
          Log in to manage your viewings, listings and saved homes.
        </EmptyState>
      </div>
    );
  }

  const landlord = isLandlord(user);
  const name = user.user_metadata?.full_name || "Your account";
  const links = [
    { href: "/saved", label: "Saved homes", icon: Heart },
    { href: "/my-bookings", label: "My viewings", icon: CalendarDays },
    { href: "/dashboard", label: "My listings", icon: LayoutDashboard },
    { href: "/listings/new", label: "List a property", icon: Plus },
    ...(admin ? [{ href: "/admin", label: "Moderation", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-palm font-serif text-2xl font-semibold text-white">
          {name.trim()[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl font-semibold text-ink">{name}</h1>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-palm">
            {landlord ? "Lister account" : "Home-seeker account"}
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-5 py-4 font-semibold text-ink hover:bg-ink/[0.03]">
              <Icon size={19} className="text-palm" aria-hidden="true" />
              {label}
              <ChevronRight size={18} className="ml-auto text-ink-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>

      <button type="button" onClick={handleLogout} className={button({ variant: "danger-ghost", full: true, className: "mt-4" })}>
        <LogOut size={17} aria-hidden="true" /> Log out
      </button>
    </div>
  );
}
