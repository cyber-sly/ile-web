"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AuthShell, { safeNext } from "@/components/AuthShell";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // Back to where they came from; otherwise listers start on their dashboard.
    const landlord = data.user?.user_metadata?.role === "landlord";
    router.push(next || (landlord ? "/dashboard" : "/listings"));
    router.refresh();
  }

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to book viewings and manage your listings."
      image="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=70"
      quote={<>Your next place is <em>already listed.</em></>}
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-5">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Link href="/forgot-password" className="-mt-2 self-end text-sm font-semibold text-palm hover:underline">
          Forgot password?
        </Link>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={loading} className={button({ size: "lg", full: true })}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-ink-muted">
        New to Ile?{" "}
        <Link href={signupHref} className="font-semibold text-palm hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}
