"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PENDING_ROLE_KEY } from "@/lib/oauth";
import AuthShell, { safeNext } from "@/components/AuthShell";
import { button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

const IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=70";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}

function readPendingRole() {
  try {
    const role = localStorage.getItem(PENDING_ROLE_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
    return role === "landlord" || role === "tenant" ? role : null;
  } catch {
    return null;
  }
}

// Google sends people back here. The Supabase client reads the tokens from
// the URL; we then fill in anything Google doesn't provide (Ile role) and
// send them on to where they were going.
function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const next = safeNext(searchParams.get("next"));

    supabase.auth.getSession().then(async ({ data }) => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const problem =
        searchParams.get("error_description") || hash.get("error_description") || searchParams.get("error") || hash.get("error");
      const user = data.session?.user;
      if (!user) {
        setError(problem ? problem.replace(/\+/g, " ") : "We couldn't sign you in with Google. Please try again.");
        return;
      }

      // First Google sign-in: record the role picked on the signup page
      // (default home-seeker) and a name if Google didn't send one.
      const pending = readPendingRole();
      const meta = user.user_metadata || {};
      const isNew = !meta.role;
      const role = meta.role || pending || "tenant";
      if (isNew) {
        const fullName = meta.full_name || meta.name || "";
        await supabase.auth.updateUser({ data: { role, full_name: fullName } });
        await supabase.from("profiles").update({ role, full_name: fullName }).eq("id", user.id);
      }

      const destination =
        next || (role === "landlord" ? (isNew ? "/listings/new" : "/dashboard") : "/listings");
      router.replace(destination);
      router.refresh();
    });
  }, [router, searchParams]);

  if (error) {
    return (
      <AuthShell title="Sign-in didn't finish" image={IMAGE}>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <AlertCircle size={30} className="text-clay" aria-hidden="true" />
          <p className="mt-3 text-ink">{error}</p>
          <Link href="/login" className={button({ full: true, className: "mt-5" })}>
            Back to log in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Signing you in…" image={IMAGE}>
      <div className="skeleton h-40 rounded-[var(--radius-card)]" aria-label="Finishing sign-in" />
    </AuthShell>
  );
}
