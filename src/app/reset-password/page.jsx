"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthShell from "@/components/AuthShell";
import NewPasswordForm from "@/components/NewPasswordForm";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { CheckCircle2, LinkIcon } from "lucide-react";

const IMAGE = "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=70";

// The email link lands here with a one-time token in the URL. The Supabase
// client reads it and signs the user in; then they choose a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState("checking"); // checking | ready | invalid | done
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    // Expired or already-used links come back with an error in the URL.
    function linkProblem() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      const code = hash.get("error_code") || query.get("error_code");
      if (!code && !hash.get("error") && !query.get("error")) return null;
      return code === "otp_expired"
        ? "This reset link has expired or has already been used."
        : hash.get("error_description") || query.get("error_description") || "This reset link isn't valid.";
    }

    // getSession() waits for the client to finish reading the token from the URL.
    let settled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (settled) return;
      settled = true;
      const problem = linkProblem();
      if (problem) {
        setLinkError(problem);
        setState("invalid");
      } else {
        setState(data.session ? "ready" : "invalid");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        settled = true;
        setState("ready");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (state === "checking") {
    return (
      <AuthShell title="Reset your password" image={IMAGE}>
        <div className="skeleton h-56 rounded-[var(--radius-card)]" aria-label="Checking your reset link" />
      </AuthShell>
    );
  }

  if (state === "invalid") {
    return (
      <AuthShell title="Link not valid" image={IMAGE}>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <LinkIcon size={30} className="text-clay" aria-hidden="true" />
          <p className="mt-3 text-ink">{linkError || "This reset link isn't valid or has expired."}</p>
          <p className="mt-2 text-sm text-ink-muted">Reset links work once and expire after an hour.</p>
          <Link href="/forgot-password" className={button({ full: true, className: "mt-5" })}>
            Send a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (state === "done") {
    return (
      <AuthShell title="Password updated" image={IMAGE}>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <CheckCircle2 size={30} className="text-palm" aria-hidden="true" />
          <p className="mt-3 text-ink">Your new password is set and you&apos;re logged in.</p>
          <button type="button" onClick={() => router.push("/listings")} className={button({ full: true, className: "mt-5" })}>
            Continue to Ile
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you don't use on other sites." image={IMAGE}>
      <Alert tone="success" className="mb-5">
        Reset link confirmed. Set your new password below.
      </Alert>
      <NewPasswordForm onDone={() => setState("done")} />
    </AuthShell>
  );
}
