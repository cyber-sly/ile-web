"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser, isLandlord, useIsAdmin } from "@/lib/useUser";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import NewPasswordForm from "@/components/NewPasswordForm";
import DeleteAccount from "@/components/DeleteAccount";
import { button } from "@/components/ui/Button";
import { Heart, CalendarDays, LayoutDashboard, Plus, LogOut, UserRound, ChevronRight, ShieldCheck, KeyRound, MonitorSmartphone } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const user = useUser();
  const admin = useIsAdmin(user);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/");
    router.refresh();
  }

  // Ends every session for this account, on every phone and computer.
  async function handleLogoutEverywhere() {
    if (!window.confirm("Log out of Ile on every device, including this one?")) return;
    setLoggingOutAll(true);
    setLogoutError("");
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setLoggingOutAll(false);
    if (error) {
      setLogoutError(error.message);
      return;
    }
    router.push("/login");
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

      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <KeyRound size={18} className="text-palm" aria-hidden="true" /> Password
          </h2>
          {!changingPassword && (
            <button
              type="button"
              onClick={() => {
                setChangingPassword(true);
                setPasswordChanged(false);
              }}
              className="text-sm font-semibold text-palm hover:underline"
            >
              Change password
            </button>
          )}
        </div>
        {passwordChanged && <Alert tone="success" className="mt-4">Your password has been changed.</Alert>}
        {changingPassword && (
          <div className="mt-4">
            <NewPasswordForm
              submitLabel="Change password"
              onDone={() => {
                setChangingPassword(false);
                setPasswordChanged(true);
              }}
            />
            <button type="button" onClick={() => setChangingPassword(false)} className={button({ variant: "ghost", full: true, className: "mt-2" })}>
              Cancel
            </button>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <MonitorSmartphone size={18} className="text-palm" aria-hidden="true" /> Devices
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Lost a phone, or logged in on a shared computer and forgot to log out? End every session at once.
        </p>
        {logoutError && <Alert className="mt-3">{logoutError}</Alert>}
        <button
          type="button"
          onClick={handleLogoutEverywhere}
          disabled={loggingOutAll}
          className={button({ variant: "neutral", full: true, className: "mt-3" })}
        >
          {loggingOutAll ? "Logging out…" : "Log out of all devices"}
        </button>
      </section>

      <button type="button" onClick={handleLogout} className={button({ variant: "danger-ghost", full: true, className: "mt-4" })}>
        <LogOut size={17} aria-hidden="true" /> Log out of this device
      </button>

      <DeleteAccount user={user} />
    </div>
  );
}
