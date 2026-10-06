"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { Mail, MailCheck } from "lucide-react";

const IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=70";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    // Only surface errors that aren't about the account itself (rate limits,
    // bad email format); never confirm whether an email is registered.
    if (resetError && resetError.status !== 400 && !/not found|no user/i.test(resetError.message)) {
      setError(
        resetError.status === 429
          ? "Too many reset emails requested. Please wait a few minutes and try again."
          : resetError.message
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" image={IMAGE}>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <MailCheck size={32} className="text-palm" aria-hidden="true" />
          <p className="mt-3 text-ink">
            If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a link to reset your password.
            It may take a minute to arrive, so check your spam folder too.
          </p>
          <p className="mt-3 text-sm text-ink-muted">The link works once and expires after an hour.</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className={button({ variant: "neutral", full: true, className: "mt-5" })}
          >
            Use a different email
          </button>
        </div>
        <p className="mt-6 text-center text-ink-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-palm hover:underline">
            Log in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we'll send you a link to set a new one."
      image={IMAGE}
    >
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={sending} className={button({ size: "lg", full: true })}>
          {sending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-ink-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-palm hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
