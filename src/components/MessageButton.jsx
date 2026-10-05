"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/lib/messaging";
import { loginHref } from "@/lib/useUser";
import { button } from "@/components/ui/Button";
import { MessageCircle } from "lucide-react";

// Opens (or creates) the chat about a listing. Listers pass `tenantId`.
export default function MessageButton({
  listingId,
  tenantId = null,
  user,
  label = "Message lister",
  variant = "secondary",
  size = "md",
  full = false,
  className = "",
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    if (!user) {
      router.push(loginHref(`/listings/${listingId}`));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const id = await startConversation(listingId, tenantId);
      router.push(`/messages/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={open} disabled={busy} className={button({ variant, size, full, className })}>
        <MessageCircle size={16} aria-hidden="true" /> {busy ? "Opening…" : label}
      </button>
      {error && <p className="mt-1.5 text-sm font-medium text-clay">{error}</p>}
    </>
  );
}
