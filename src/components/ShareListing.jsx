"use client";

import { useEffect, useState } from "react";
import { Check, Image as ImageIcon, Link2, X } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { cardUrl, fetchReferralSummary, shareMessage } from "@/lib/referrals";
import { button } from "@/components/ui/Button";

// Share a listing: a tracked link for chats, or a ready-made picture for
// WhatsApp Status and Instagram Stories. Logged-in sharers' links carry their
// invite code; logged-out links don't.
export default function ShareListing({ listing, user, onClose }) {
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [prepared, setPrepared] = useState(null); // { url, file }

  useEffect(() => {
    let live = true;
    if (user) {
      fetchReferralSummary()
        .then((s) => live && setCode(s?.code || null))
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [user]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const message = shareMessage({ listing, site: SITE_URL, code });
  const image = cardUrl({ site: SITE_URL, listingId: listing.id, code });

  // Fetch the picture as soon as the dialog opens, so tapping can share it
  // straight away (phones only allow sharing right after a tap).
  useEffect(() => {
    let live = true;
    fetch(image)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!live || !blob) return;
        const f = new File([blob], "ile-listing.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [f] })) setPrepared({ url: image, file: f });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [image]);

  async function sendLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text: message });
        return;
      } catch {
        // dismissed: fall back to copying
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  // Only the picture made for the current link (the code can arrive later).
  const file = prepared?.url === image ? prepared.file : null;

  function postImage() {
    navigator.share({ files: [file], text: message }).catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[var(--radius-hero)] bg-surface p-6 shadow-[var(--shadow-float)] sm:rounded-[var(--radius-hero)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="share-title" className="font-serif text-2xl font-semibold text-ink">
            Share this listing
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {code && <p className="mt-1 text-sm text-ink-muted">Your link includes your code {code}, so people who join count for you.</p>}
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" onClick={sendLink} className={button({ size: "lg", full: true })}>
            {copied ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
            {copied ? "Link copied" : "Send link"}
          </button>
          {file ? (
            <button type="button" onClick={postImage} className={button({ variant: "secondary", size: "lg", full: true })}>
              <ImageIcon size={18} aria-hidden="true" /> Post to Status / Stories
            </button>
          ) : (
            <>
              <a href={image} target="_blank" rel="noopener noreferrer" className={button({ variant: "secondary", size: "lg", full: true })}>
                <ImageIcon size={18} aria-hidden="true" /> Post to Status / Stories
              </a>
              <p className="text-sm text-ink-muted">Opens the picture. Long-press or right-click it to save, then post it.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
