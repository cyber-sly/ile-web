"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser, isLandlord, useIsAdmin } from "@/lib/useUser";
import { useSavedIds } from "@/lib/saved";
import { useUnreadCount } from "@/lib/messaging";
import { fetchMyProfile, profileCompleteness } from "@/lib/profile";
import { listerLabel } from "@/lib/property";
import { CONTACT_EMAIL } from "@/lib/site";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/Avatar";
import NewPasswordForm from "@/components/NewPasswordForm";
import DeleteAccount from "@/components/DeleteAccount";
import SettingsRow, { SettingsGroup } from "@/components/SettingsRow";
import { button } from "@/components/ui/Button";
import {
  Heart, CalendarDays, LayoutDashboard, PlusCircle, LogOut, UserRound, ShieldCheck, KeyRound,
  MonitorSmartphone, Pencil, MessageCircle, Shield, FileText, Mail, Eye, Building2, Home,
} from "lucide-react";

// Small circular progress ring for profile completeness.
function Ring({ percent }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">
        {percent}%
      </text>
    </svg>
  );
}

function StatTile({ href, icon: Icon, value, label, alert = false }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 transition-colors hover:border-line-strong"
    >
      <span className="flex items-center justify-between">
        <Icon size={18} className={alert ? "text-clay" : "text-palm"} aria-hidden="true" />
        {alert && <span className="h-2 w-2 rounded-full bg-clay" aria-hidden="true" />}
      </span>
      <span className="text-2xl font-bold leading-none text-ink">{value ?? "–"}</span>
      <span className="text-xs font-medium text-ink-muted">{label}</span>
    </Link>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const user = useUser();
  const admin = useIsAdmin(user);
  const savedCount = useSavedIds().length;
  const unread = useUnreadCount(user);
  const [profile, setProfile] = useState(null);
  const [counts, setCounts] = useState({ viewings: null, listings: null });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchMyProfile().then(setProfile).catch(() => {});
    Promise.all([
      supabase
        .from("inspections")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", user.id)
        .in("status", ["pending", "countered", "confirmed"]),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("landlord_id", user.id),
    ]).then(([v, l]) => setCounts({ viewings: v.count ?? 0, listings: l.count ?? 0 }));
  }, [user]);

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
      <div className="mx-auto max-w-2xl px-4 py-8" aria-hidden="true">
        <div className="skeleton h-44 rounded-[var(--radius-hero)]" />
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-[var(--radius-card)]" />
          ))}
        </div>
        <div className="skeleton mt-6 h-64 rounded-[var(--radius-card)]" />
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

  const isLister = isLandlord(user) || Boolean(profile?.lister_type) || counts.listings > 0;
  const name = profile?.full_name?.trim() || user.user_metadata?.full_name || "Your account";
  const { percent, missing } = profileCompleteness(profile, isLister);
  const memberSince = new Date(profile?.created_at || user.created_at).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
  const roleLabel = profile?.lister_type ? listerLabel(profile.lister_type) : isLister ? "Lister" : "Home-seeker";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      {/* Profile header */}
      <header className="relative overflow-hidden rounded-[var(--radius-hero)] bg-palm-dark p-5 text-white sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-gold/10" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <Avatar src={profile?.avatar_url} name={name} size="lg" className="ring-4 ring-white/15" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-2xl font-semibold sm:text-3xl">{name}</h1>
            {profile?.business_name && (
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white/90">
                <Building2 size={14} aria-hidden="true" /> {profile.business_name}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                {isLister ? <Building2 size={12} aria-hidden="true" /> : <Home size={12} aria-hidden="true" />} {roleLabel}
              </span>
              {admin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-palm-dark">
                  <ShieldCheck size={12} aria-hidden="true" /> Admin
                </span>
              )}
            </div>
            <p className="mt-2 truncate text-xs text-white/70">
              {user.email} · Member since {memberSince}
            </p>
          </div>
        </div>

        {profile && percent < 100 && (
          <Link
            href="/account/profile"
            className="relative mt-5 flex items-center gap-3 rounded-[var(--radius-control)] bg-white/10 p-3 transition-colors hover:bg-white/15"
          >
            <Ring percent={percent} />
            <span className="min-w-0 text-sm">
              <span className="block font-semibold">Complete your profile</span>
              <span className="block truncate text-white/75">Add {missing.slice(0, 2).join(" and ")}</span>
            </span>
          </Link>
        )}

        <div className="relative mt-5 flex flex-wrap gap-2">
          <Link href="/account/profile" className={button({ variant: "onDark", size: "sm" })}>
            <Pencil size={15} aria-hidden="true" /> Edit profile
          </Link>
          {isLister && (
            <Link
              href={`/u/${user.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-white/30 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Eye size={15} aria-hidden="true" /> View public profile
            </Link>
          )}
        </div>
      </header>

      {/* At a glance */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile href="/saved" icon={Heart} value={savedCount} label="Saved homes" />
        <StatTile href="/my-bookings" icon={CalendarDays} value={counts.viewings} label="Upcoming viewings" />
        <StatTile href="/messages" icon={MessageCircle} value={unread} label="Unread messages" alert={unread > 0} />
        <StatTile href="/dashboard" icon={LayoutDashboard} value={counts.listings} label="My listings" />
      </div>

      <div className="mt-8 flex flex-col gap-7">
        <SettingsGroup title="Activity">
          <SettingsRow href="/saved" icon={Heart} tone="rose" label="Saved homes" description="Places you've hearted" />
          <SettingsRow href="/my-bookings" icon={CalendarDays} tone="palm" label="My viewings" description="Viewings you've booked" />
          <SettingsRow href="/messages" icon={MessageCircle} tone="sky" label="Messages" description="Chats with listers and home-seekers" badge={unread} />
          <SettingsRow href="/dashboard" icon={LayoutDashboard} tone="ink" label="My listings" description="Manage listings and viewing requests" />
          <SettingsRow href="/listings/new" icon={PlusCircle} tone="gold" label="List a property" description="Free, in about five minutes" />
        </SettingsGroup>

        <SettingsGroup title="Profile and security">
          <SettingsRow href="/account/profile" icon={UserRound} tone="palm" label="Edit profile" description="Photo, bio, languages and more" />
          <SettingsRow
            icon={KeyRound}
            tone="gold"
            label="Password"
            description={passwordChanged ? "Changed just now" : "Change your password"}
            expanded={passwordOpen}
            onClick={() => {
              setPasswordOpen((o) => !o);
              setPasswordChanged(false);
            }}
          />
          {passwordOpen && (
            <div className="bg-cream/60 px-4 py-4">
              <NewPasswordForm
                submitLabel="Change password"
                onDone={() => {
                  setPasswordOpen(false);
                  setPasswordChanged(true);
                }}
              />
            </div>
          )}
          <SettingsRow
            icon={MonitorSmartphone}
            tone="sky"
            label={loggingOutAll ? "Logging out…" : "Log out of all devices"}
            description="Lost a phone or used a shared computer? End every session."
            onClick={handleLogoutEverywhere}
            disabled={loggingOutAll}
          />
        </SettingsGroup>
        {passwordChanged && <Alert tone="success" className="-mt-4">Your password has been changed.</Alert>}
        {logoutError && <Alert className="-mt-4">{logoutError}</Alert>}

        {admin && (
          <SettingsGroup title="Admin">
            <SettingsRow href="/admin" icon={ShieldCheck} tone="gold" label="Moderation" description="Reports, removed listings and reviews" />
          </SettingsGroup>
        )}

        <SettingsGroup title="Help and legal">
          <SettingsRow href={`mailto:${CONTACT_EMAIL}`} external icon={Mail} tone="palm" label="Contact support" description={CONTACT_EMAIL} />
          <SettingsRow href="/privacy" icon={Shield} tone="ink" label="Privacy Policy" />
          <SettingsRow href="/terms" icon={FileText} tone="ink" label="Terms of Service" />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon={LogOut} danger label="Log out" description="Of this device only" onClick={handleLogout} />
        </SettingsGroup>

        <DeleteAccount user={user} />
      </div>
    </div>
  );
}
