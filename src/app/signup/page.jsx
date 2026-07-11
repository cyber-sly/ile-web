"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, Mail, Lock, UserPlus, AlertCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("tenant");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/listings");
  }

  return (
    <div className="max-w-sm mx-auto mt-12 p-6 bg-white border border-mist rounded-xl shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink mb-1 flex items-center gap-2">
        <UserPlus className="text-palm" size={24} /> Sign Up
      </h1>
      <p className="text-ink/60 text-sm mb-6">Create an account to get started.</p>
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <User size={16} className="text-ink/40 shrink-0" />
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <Mail size={16} className="text-ink/40 shrink-0" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>
        <label className="flex items-center gap-2 border border-mist rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-palm">
          <Lock size={16} className="text-ink/40 shrink-0" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="text-ink outline-none w-full"
          />
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-mist rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-palm"
        >
          <option value="tenant">I'm looking for a house</option>
          <option value="landlord">I'm listing a property</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-palm text-white rounded-lg py-2 font-semibold hover:bg-palm-dark disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        {error && (
          <p className="flex items-center gap-1.5 text-clay text-sm">
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </form>
    </div>
  );
}