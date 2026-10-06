"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Field from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { Lock } from "lucide-react";

const MIN_LENGTH = 8;

// Set a new password for the signed-in user. Used after a reset link and on
// the account page.
export default function NewPasswordForm({ onDone, submitLabel = "Save new password" }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (password.length < MIN_LENGTH) er.password = `Use at least ${MIN_LENGTH} characters.`;
    if (confirm !== password) er.confirm = "The two passwords don't match.";
    setErrors(er);
    setFormError("");
    if (Object.keys(er).length) return;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setFormError(
        /different from the old/i.test(error.message)
          ? "Choose a password you haven't used on this account before."
          : error.message
      );
      return;
    }
    setPassword("");
    setConfirm("");
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Field
        label="New password"
        type="password"
        icon={Lock}
        autoComplete="new-password"
        minLength={MIN_LENGTH}
        hint={`At least ${MIN_LENGTH} characters.`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        required
      />
      <Field
        label="Confirm new password"
        type="password"
        icon={Lock}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
        required
      />
      {formError && <Alert>{formError}</Alert>}
      <button type="submit" disabled={saving} className={button({ size: "lg", full: true })}>
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
