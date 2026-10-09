"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMyAccount, hasPassword, verifyPassword } from "@/lib/account";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { Lock, Trash2 } from "lucide-react";

// "Delete my account" on the Account page. Explains exactly what goes and
// what stays, then asks for the password (or typing DELETE for Google-only
// accounts) before anything is removed.
export default function DeleteAccount({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const usesPassword = hasPassword(user);
  const ready = usesPassword ? password.length > 0 : typed.trim().toUpperCase() === "DELETE";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (usesPassword && !(await verifyPassword(user.email, password))) {
        setError("That password isn't right.");
        setBusy(false);
        return;
      }
      await deleteMyAccount(user.id);
      router.push("/?account=deleted");
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong. Your account was not deleted.");
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-clay/40 bg-surface p-5">
      <h2 className="flex items-center gap-2 font-semibold text-clay">
        <Trash2 size={18} aria-hidden="true" /> Delete account
      </h2>
      {!open ? (
        <>
          <p className="mt-1 text-sm text-ink-muted">Permanently delete your Ile account and your listings.</p>
          <button type="button" onClick={() => setOpen(true)} className={button({ variant: "danger-ghost", full: true, className: "mt-3" })}>
            Delete my account
          </button>
        </>
      ) : (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-4">
          <div className="rounded-[var(--radius-control)] bg-clay-soft p-4 text-sm text-ink">
            <p className="font-semibold">This can&apos;t be undone.</p>
            <p className="mt-2 font-semibold">Deleted:</p>
            <ul className="ml-5 list-disc text-ink/85">
              <li>your profile and login</li>
              <li>all your listings, with their photos and videos</li>
              <li>viewings on your listings and viewings you booked</li>
              <li>reviews other people wrote about you</li>
            </ul>
            <p className="mt-2 font-semibold">Kept, without your name:</p>
            <ul className="ml-5 list-disc text-ink/85">
              <li>your messages, so the people you chatted with keep their history (you&apos;ll show as &ldquo;Deleted user&rdquo;)</li>
              <li>reviews you wrote, which were already anonymous</li>
            </ul>
          </div>

          {usesPassword ? (
            <Field
              label="Enter your password to confirm"
              type="password"
              icon={Lock}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          ) : (
            <Field
              label='Type "DELETE" to confirm'
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          )}

          {error && <Alert>{error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={!ready || busy} className={button({ variant: "danger", className: "flex-1" })}>
              {busy ? "Deleting…" : "Permanently delete my account"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPassword("");
                setTyped("");
                setError("");
              }}
              className={button({ variant: "ghost" })}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
