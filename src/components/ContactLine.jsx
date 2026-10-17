"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { localPhone } from "@shared/people.js";
import { fetchBookingContact } from "@shared/privacy.js";
import { supabase } from "@/lib/supabaseClient";

// The other person's phone on a confirmed viewing or accepted stay. The parent
// only shows this for confirmed bookings; the database checks again.
export default function ContactLine({ kind, id, name, className = "" }) {
  const [phone, setPhone] = useState(undefined);

  useEffect(() => {
    let live = true;
    fetchBookingContact(supabase, kind, id).then((p) => live && setPhone(p));
    return () => {
      live = false;
    };
  }, [kind, id]);

  if (phone === undefined) return null;
  if (!phone) return <p className={`text-sm text-ink-muted ${className}`}>No phone number added. Use chat.</p>;

  return (
    <a
      href={`tel:${phone}`}
      aria-label={`Call ${name}`}
      className={`inline-flex items-center gap-2 rounded-full bg-palm-soft px-3 py-1.5 text-sm font-semibold text-palm hover:bg-palm hover:text-white ${className}`}
    >
      <Phone size={15} aria-hidden="true" />
      Call {name}: {localPhone(phone)}
    </a>
  );
}
