"use client";

import { useEffect, useState } from "react";
import { AtSign, Phone } from "lucide-react";
import { normalizeUsername, usernameError } from "@shared/people.js";
import { usernameAvailable } from "@shared/privacy.js";
import { supabase } from "@/lib/supabaseClient";
import Field from "@/components/ui/Field";

// Username (with a live check), what others see, and the private phone number.
export default function PrivacyFields({ v, set, setValue, errors = {} }) {
  const [check, setCheck] = useState({ name: "", state: "" }); // state: "", "checking", "free", "taken"
  const typed = normalizeUsername(v.username);

  // Ask the database once typing pauses.
  useEffect(() => {
    if (!typed || usernameError(typed)) return;
    let live = true;
    const timer = setTimeout(() => {
      setCheck({ name: typed, state: "checking" });
      usernameAvailable(supabase, typed).then((ok) => {
        if (live) setCheck({ name: typed, state: ok === null ? "" : ok ? "free" : "taken" });
      });
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [typed]);

  const current = check.name === typed ? check.state : "";
  const usernameHint =
    errors.username ||
    (typed && usernameError(typed)) ||
    (current === "taken" ? "That username is taken." : current === "free" ? "Available" : current === "checking" ? "Checking…" : null);

  return (
    <>
      <Field
        label="Username"
        optional
        icon={AtSign}
        maxLength={21}
        autoCapitalize="none"
        autoComplete="off"
        placeholder="e.g. tunde_homes"
        value={v.username}
        onChange={set("username")}
        error={errors.username || (current === "taken" ? "That username is taken." : typed && usernameError(typed) ? usernameError(typed) : undefined)}
        hint={!errors.username && current !== "taken" && !(typed && usernameError(typed)) ? usernameHint || "Letters, numbers and _ (3–20). Others can see it." : undefined}
      />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Show others my</legend>
        <div className="flex gap-2">
          {[
            { value: "name", label: "Name" },
            { value: "username", label: typed ? `@${typed}` : "@username" },
          ].map((o) => (
            <label
              key={o.value}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${
                v.show_as === o.value ? "border-palm bg-palm-soft text-palm" : "border-line-strong bg-surface text-ink"
              }`}
            >
              <input type="radio" name="show_as" value={o.value} checked={v.show_as === o.value} onChange={() => setValue("show_as", o.value)} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
        {errors.show_as && <p className="mt-1.5 text-sm font-medium text-clay">{errors.show_as}</p>}
      </fieldset>
      <Field
        label="Phone number"
        optional
        type="tel"
        icon={Phone}
        autoComplete="tel"
        placeholder="0803 123 4567"
        value={v.phone}
        onChange={set("phone")}
        error={errors.phone}
        hint="Private. Only shared with the other person after a booking is confirmed."
      />
    </>
  );
}
