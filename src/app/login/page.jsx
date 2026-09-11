"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Mail, Lock, LogIn, AlertCircle, Home } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/listings");
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=70"
        alt="A modern Nigerian apartment exterior"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-ink/60" />

      <div className="hidden md:block absolute top-20 left-16 w-20 h-20 rounded-full bg-clay/30 blur-xl animate-float" />
      <div
        className="hidden md:block absolute bottom-20 right-16 w-16 h-16 rounded-full bg-sun/30 blur-xl animate-float"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-white mb-1 flex items-center justify-center gap-2">
            <LogIn size={24} /> Log In
          </h1>
          <p className="text-white/80 text-sm">Welcome back.</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 bg-white/95 backdrop-blur p-6 rounded-2xl border border-white/40 shadow-2xl"
        >
          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <Mail size={16} className="text-ink/40 shrink-0" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>
          <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm transition-shadow">
            <Lock size={16} className="text-ink/40 shrink-0" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-ink outline-none w-full bg-transparent"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-palm text-white rounded-lg py-2 font-semibold hover:bg-palm-dark disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
          {error && (
            <p className="flex items-center gap-1.5 text-clay text-sm">
              <AlertCircle size={16} /> {error}
            </p>
          )}
        </form>

        <p className="text-sm text-white/80 mt-4 text-center">
          Don't have an account?{" "}
          <Link href="/signup" className="text-white font-medium underline">
            Sign up
          </Link>
        </p>
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 text-white/70 text-sm mt-4 hover:text-white transition-colors"
        >
          <Home size={14} /> Back to home
        </Link>
      </div>
    </div>
  );
}