"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { fetchNames, refreshUnread } from "@/lib/messaging";
import { priceParts } from "@/lib/property";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import Alert from "@/components/ui/Alert";
import { ArrowLeft, Send, ShieldCheck, ImageOff } from "lucide-react";

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
}

const clock = (iso) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

export default function ConversationPage() {
  const { id } = useParams();
  const user = useUser();
  const [convo, setConvo] = useState(undefined);
  const [otherName, setOtherName] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  // Mark the other person's messages as read while the chat is open.
  const markRead = useCallback(
    async (list) => {
      if (!user) return;
      const unread = list.filter((m) => !m.read_at && m.sender_id !== user.id).map((m) => m.id);
      if (unread.length === 0) return;
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      refreshUnread();
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data: c } = await supabase
        .from("conversations")
        .select("id, tenant_id, landlord_id, listings(id, title, image_url, price, price_period, listing_type)")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (!c) {
        setConvo(null);
        return;
      }
      const otherId = c.tenant_id === user.id ? c.landlord_id : c.tenant_id;
      const [names, { data: msgs }] = await Promise.all([
        fetchNames([otherId]),
        supabase.from("messages").select("*").eq("conversation_id", id).order("created_at"),
      ]);
      if (cancelled) return;
      setConvo(c);
      setOtherName(otherId ? names[otherId] || (c.tenant_id === user.id ? "The lister" : "Home-seeker") : "Deleted user");
      setMessages(msgs || []);
      markRead(msgs || []);
    }
    load();

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          markRead([payload.new]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id, user, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, body })
      .select()
      .single();
    setSending(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setDraft("");
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  }

  if (user === undefined || (user && convo === undefined)) return <PageSkeleton />;

  if (!user) {
    return (
      <AccessWall title="Log in to see this chat" primary={{ href: `/login?next=/messages/${id}`, label: "Log in" }}>
        Messages are only visible to the two people in the conversation.
      </AccessWall>
    );
  }

  if (!convo) {
    return (
      <AccessWall title="Chat not found" primary={{ href: "/messages", label: "Back to messages" }}>
        It may have been removed, or it belongs to another account.
      </AccessWall>
    );
  }

  const l = convo.listings;
  const isTenant = convo.tenant_id === user.id;

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem-4rem)] max-w-3xl flex-col px-0 sm:px-6 md:h-[calc(100dvh-4rem)] md:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:rounded-t-[var(--radius-card)] sm:border sm:border-b-0">
        <Link href="/messages" aria-label="Back to messages" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{otherName}</p>
          <p className="text-xs text-ink-muted">{isTenant ? "Lister" : "Home-seeker"}</p>
        </div>
        {l && (
          <Link href={`/listings/${l.id}`} className="flex min-w-0 max-w-[45%] items-center gap-2 rounded-[var(--radius-control)] border border-line p-1.5 pr-3 hover:border-line-strong">
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-line">
              {l.image_url ? (
                <img src={l.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageOff size={16} className="m-2.5 text-ink-muted/50" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-ink">{l.title}</span>
              <span className="block truncate text-xs text-ink-muted">
                {priceParts(l).amount} {priceParts(l, { short: true }).suffix}
              </span>
            </span>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-cream px-4 py-4 sm:border-x sm:border-line" aria-live="polite">
        <p className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-[var(--radius-control)] bg-palm-soft px-3.5 py-2.5 text-xs text-palm">
          <ShieldCheck size={15} className="mt-px shrink-0" aria-hidden="true" />
          Keep chats on Ile. Never pay an inspection fee or a deposit before you&apos;ve seen the property in person.
        </p>
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-muted">
            {isTenant ? "Ask about the property, the area, or when you can view it." : "Say hello and answer any questions."}
          </p>
        )}
        <ol className="flex flex-col gap-1.5">
          {messages.map((m, i) => {
            const mine = m.sender_id === user.id;
            const day = dayLabel(m.created_at);
            const showDay = i === 0 || day !== dayLabel(messages[i - 1].created_at);
            return (
              <li key={m.id} className="flex flex-col">
                {showDay && <span className="my-3 self-center text-xs font-semibold text-ink-muted">{day}</span>}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    mine ? "self-end rounded-br-md bg-palm text-white" : "self-start rounded-bl-md border border-line bg-surface text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[11px] ${mine ? "text-white/70" : "text-ink-muted"}`}>
                    {clock(m.created_at)}
                    {mine && m.read_at && " · Seen"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={endRef} />
      </div>

      {/* Composer (hidden once the other person has deleted their account) */}
      {!convo.tenant_id || !convo.landlord_id ? (
        <p className="border-t border-line bg-surface p-4 text-center text-sm text-ink-muted sm:rounded-b-[var(--radius-card)] sm:border sm:border-t-0">
          This person has deleted their Ile account, so you can&apos;t reply.
        </p>
      ) : (
      <form onSubmit={send} className="border-t border-line bg-surface p-3 sm:rounded-b-[var(--radius-card)] sm:border sm:border-t-0">
        {error && <Alert className="mb-2">{error}</Alert>}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Message</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Write a message"
              className="max-h-32 min-h-11 w-full resize-none rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink outline-none [field-sizing:content] placeholder:text-ink-muted/80 focus:border-palm focus:ring-2 focus:ring-palm/25"
            />
          </label>
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-palm text-white transition-colors hover:bg-palm-dark disabled:opacity-40"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
