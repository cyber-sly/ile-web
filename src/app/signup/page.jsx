"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, setRememberMe } from "@/lib/supabaseClient";
import AuthShell, { safeNext } from "@/components/AuthShell";
import GoogleButton from "@/components/GoogleButton";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { User, Mail, Lock, Search, Building2, MailCheck } from "lucide-react";

const ROLES = [
  { value: "tenant", icon: Search, title: "Find a place", body: "Rent or buy a home" },
  { value: "landlord", icon: Building2, title: "List property", body: "Owner, agent or caretaker" },
];

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(searchParams.get("role") === "landlord" ? "landlord" : "tenant");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    setRememberMe(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // With email confirmation on, Supabase returns no session until the link is clicked.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    router.push(next || (role === "landlord" ? "/listings/new" : "/listings"));
    router.refresh();
  }

  if (checkEmail) {
    return (
      <AuthShell
        title="Check your email"
        image="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=70"
      >
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <MailCheck size={32} className="text-palm" aria-hidden="true" />
          <p className="mt-3 text-ink">
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate your account, then log in.
          </p>
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className={button({ full: true, className: "mt-5" })}
          >
            Go to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free for everyone. No search or inspection fees."
      image="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=70"
      quote={<>A home, a shop, a plot. <em>Without the wahala.</em></>}
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-5">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">I want to</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, icon: Icon, title, body }) => {
              const on = role === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-[var(--radius-card)] border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-palm ${
                    on ? "border-palm bg-palm-soft" : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={on}
                    onChange={() => setRole(value)}
                    className="sr-only"
                  />
                  <Icon size={22} className={on ? "text-palm" : "text-ink-muted"} aria-hidden="true" />
                  <span className="mt-1 font-semibold text-ink">{title}</span>
                  <span className="text-sm text-ink-muted">{body}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <GoogleButton role={role} next={next} label="Sign up with Google" />

        <Field
          label="Full name"
          icon={User}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Field
          label="Email"
          type="email"
          icon={Mail}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          minLength={8}
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className={button({ size: "lg", full: true })}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-ink-muted">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-semibold text-palm hover:underline"
        >
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
