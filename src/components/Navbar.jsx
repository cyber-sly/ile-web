"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }

    getUser();

    // Keep the navbar in sync if auth state changes elsewhere (login/logout in another tab, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav
      style={{
        display: "flex",
        gap: "16px",
        padding: "16px 24px",
        borderBottom: "1px solid #ddd",
        alignItems: "center",
      }}
    >
      <Link href="/" style={{ fontWeight: "bold" }}>
        Ile.
      </Link>
      <Link href="/listings">Listings</Link>

      {user ? (
        <>
          <Link href="/listings/new">Post a Listing</Link>
          <Link href="/dashboard">Dashboard</Link>
          <button onClick={handleLogout} style={{ marginLeft: "auto" }}>
            Log Out
          </button>
        </>
      ) : (
        <>
          <Link href="/signup" style={{ marginLeft: "auto" }}>
            Sign Up
          </Link>
          <Link href="/login">Log In</Link>
        </>
      )}
    </nav>
  );
}