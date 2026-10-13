"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, Share2 } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { fetchReferralSummary, inviteMessage } from "@/lib/referrals";
import { button } from "@/components/ui/Button";

// "Your invite code: TUNDE7" with Invite a lister / Copy code. Hidden until
// the referral feature is set up in the database.
export default function InviteCard() {
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let live = true;
    fetchReferralSummary()
      .then((s) => live && setCode(s?.code || null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!code) return null;
  const message = inviteMessage({ site: SITE_URL, code });

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {}
  }

  async function invite() {
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // dismissed: fall back to copying
      }
    }
    copy(message, "invite");
  }

  return (
    <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
          <Gift size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">Your invite code</p>
          <p className="font-serif text-2xl font-semibold tracking-wide text-ink">{code}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink-muted">
        Earn 7 boost days for every lister who joins with your code and lists a property, and 3 days for every 5 home-seekers.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={invite} className={button({ size: "sm" })}>
          {copied === "invite" ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
          {copied === "invite" ? "Invite copied" : "Invite a lister"}
        </button>
        <button type="button" onClick={() => copy(code, "code")} className={button({ variant: "neutral", size: "sm" })}>
          {copied === "code" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          {copied === "code" ? "Copied" : "Copy code"}
        </button>
      </div>
    </section>
  );
}
