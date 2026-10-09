import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = () => readFileSync(join(import.meta.dirname, "..", "..", "supabase", "push_notifications.sql"), "utf8");

test("push tables have row level security", () => {
  const s = sql();
  for (const t of ["push_tokens", "notifications", "notification_prefs"]) {
    assert.match(s, new RegExp(`alter table public\.${t} enable row level security`), t);
  }
});

test("notifications cannot be inserted by app users", () => {
  const s = sql();
  assert.doesNotMatch(s, /on public\.notifications for insert/);
  assert.match(s, /revoke insert, delete on public\.notifications from anon, authenticated/);
  assert.match(s, /grant update \(read_at\) on public\.notifications to authenticated/);
});

test("every security definer function sets search_path", () => {
  const s = sql();
  const blocks = s.split(/create or replace function/i).slice(1);
  assert.ok(blocks.length >= 6);
  for (const b of blocks) {
    if (/security definer/i.test(b.split("$$")[0])) assert.match(b.split("$$")[0], /set search_path = public/i, b.slice(0, 60));
  }
});

test("message notifications collapse within five minutes", () => {
  const body = sql().split(/create or replace function public\.ile_notify_message/i)[1].split("$$;")[0];
  assert.match(body, /interval '5 minutes'/);
  assert.match(body, /read_at is null/);
});

test("the function secret comes from Vault", () => {
  const s = sql();
  assert.match(s, /vault\.decrypted_secrets/);
  assert.doesNotMatch(s, /eyJ[A-Za-z0-9_-]{10,}/);
});

test("schedules are idempotent", () => {
  const s = sql();
  const schedules = s.match(/cron\.schedule\(/g) || [];
  assert.equal(schedules.length, 3);
  assert.equal((s.match(/cron\.unschedule\(/g) || []).length, 3);
});
