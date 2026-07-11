"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Home, Search, PlusCircle, LayoutDashboard, Bookmark, LogOut } from "lucide-react";

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
    <nav className="flex gap-6 px-6 py-4 border-b border-mist items-center bg-white/80 backdrop-blur">
      <Link href="/" className="font-display font-bold text-lg text-palm flex items-center gap-1.5">
        <Home size={20} />
        Ile.
      </Link>
      <Link href="/listings" className="flex items-center gap-1.5 text-ink/70 hover:text-palm transition-colors">
        <Search size={16} /> Listings
      </Link>

      {user ? (
        <>
          <Link href="/listings/new" className="flex items-center gap-1.5 text-ink/70 hover:text-palm transition-colors">
            <PlusCircle size={16} /> Post a Listing
          </Link>
          <Link href="/dashboard" className="flex items-center gap-1.5 text-ink/70 hover:text-palm transition-colors">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link href="/my-bookings" className="flex items-center gap-1.5 text-ink/70 hover:text-palm transition-colors">
            <Bookmark size={16} /> My Bookings
          </Link>
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-1.5 text-sm text-clay hover:text-red-800 transition-colors"
          >
            <LogOut size={16} /> Log Out
          </button>
        </>
      ) : (
        <>
          <Link href="/signup" className="ml-auto text-ink/70 hover:text-palm transition-colors">
            Sign Up
          </Link>
          <Link href="/login" className="text-ink/70 hover:text-palm transition-colors">
            Log In
          </Link>
        </>
      )}
    </nav>
  );
}