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

test("claiming pending notifications is atomic and only for the server", () => {
  const s = sql();
  const body = s.split(/create or replace function public\.ile_claim_notifications/i)[1].split("$$;")[0];
  assert.match(body, /for update skip locked/);
  assert.match(body, /sent_at is null/);
  assert.match(s, /revoke execute on function public\.ile_claim_notifications\(integer\) from public, anon, authenticated/);
  assert.match(s, /grant execute on function public\.ile_claim_notifications\(integer\) to service_role/);
});

test("a phone can stop its notifications even after its session has ended", () => {
  const s = sql();
  const body = s.split(/create or replace function public\.unregister_push_token/i)[1].split("$$;")[0];
  assert.doesNotMatch(body, /auth\.uid\(\)/);
  assert.match(s, /grant execute on function public\.unregister_push_token\(text\) to anon, authenticated/);
});

test("the Supabase CLI config names the project and keeps send-push's own auth", () => {
  const toml = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "config.toml"), "utf8");
  assert.match(toml, /^project_id = "/m);
  assert.match(toml, /\[functions\.send-push\]\s*\nverify_jwt = false/);
});

test("Firebase's Android config file is uploaded with app builds", () => {
  const ignore = readFileSync(join(import.meta.dirname, "..", "..", "mobile", ".gitignore"), "utf8");
  assert.doesNotMatch(ignore, /^google-services\.json$/m);
});
