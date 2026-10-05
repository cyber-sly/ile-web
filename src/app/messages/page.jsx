"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { fetchNames } from "@/lib/messaging";
import AccessWall, { PageSkeleton } from "@/components/AccessWall";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import { button } from "@/components/ui/Button";
import { MessagesSquare, ImageOff } from "lucide-react";

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return d.toLocaleDateString("en-NG", { weekday: "short" });
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// Conversations with the other person's name, latest message and unread count.
async function loadThreads(userId) {
  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id, tenant_id, landlord_id, last_message_at, listings(id, title, image_url)")
    .order("last_message_at", { ascending: false });
  if (convoError) return { threads: [], error: convoError.message };

  const ids = convos.map((c) => c.id);
  const [names, { data: msgs }] = await Promise.all([
    fetchNames(convos.map((c) => (c.tenant_id === userId ? c.landlord_id : c.tenant_id))),
    ids.length
      ? supabase
          .from("messages")
          .select("conversation_id, sender_id, body, created_at, read_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] }),
  ]);

  const latest = {};
  const unread = {};
  for (const m of msgs || []) {
    if (!latest[m.conversation_id]) latest[m.conversation_id] = m;
    if (!m.read_at && m.sender_id !== userId) unread[m.conversation_id] = (unread[m.conversation_id] || 0) + 1;
  }
  const threads = convos.map((c) => {
    const otherId = c.tenant_id === userId ? c.landlord_id : c.tenant_id;
    return {
      ...c,
      otherName: names[otherId] || (c.tenant_id === userId ? "Lister" : "Home-seeker"),
      role: c.tenant_id === userId ? "Lister" : "Home-seeker",
      latest: latest[c.id],
      unread: unread[c.id] || 0,
    };
  });
  return { threads, error: "" };
}

export default function InboxPage() {
  const user = useUser();
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const refresh = () =>
      loadThreads(user.id).then((r) => {
        if (cancelled) return;
        setThreads(r.threads);
        setError(r.error);
      });
    refresh();
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (user === undefined || (user && threads === null)) return <PageSkeleton />;

  if (!user) {
    return (
      <AccessWall title="Log in to see your messages" primary={{ href: "/login?next=/messages", label: "Log in" }}>
        Your chats with listers and home-seekers are kept here.
      </AccessWall>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-5xl">Messages</h1>
      <p className="mt-2 text-ink-muted">Chat with listers and home-seekers without sharing your number.</p>

      {error && <Alert className="mt-6">{error}</Alert>}

      <div className="mt-8">
        {threads.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No messages yet"
            action={
              <Link href="/listings" className={button()}>
                Browse listings
              </Link>
            }
          >
            Tap &ldquo;Message lister&rdquo; on any listing to ask a question before you book a viewing.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/messages/${t.id}`} className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-ink/[0.03]">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-line">
                    {t.listings?.image_url ? (
                      <img src={t.listings.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-ink-muted/50">
                        <ImageOff size={20} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${t.unread ? "font-bold" : "font-semibold"} text-ink`}>{t.otherName}</span>
                      {t.latest && <span className="shrink-0 text-xs text-ink-muted">{timeAgo(t.latest.created_at)}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {t.role} · {t.listings?.title || "Listing removed"}
                    </span>
                    <span className={`mt-0.5 block truncate text-sm ${t.unread ? "font-semibold text-ink" : "text-ink-muted"}`}>
                      {t.latest ? `${t.latest.sender_id === user.id ? "You: " : ""}${t.latest.body}` : "No messages yet"}
                    </span>
                  </span>
                  {t.unread > 0 && (
                    <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-palm px-1.5 text-xs font-bold text-white">
                      {t.unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
