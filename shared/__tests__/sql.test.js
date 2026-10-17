import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Re-running an older migration must not bring back the sign-up trigger
// without the role whitelist (see fix_signup_trigger.sql).
test("every definition of the new-user trigger accepts only tenant or landlord", () => {
  const dir = join(import.meta.dirname, "..", "..", "supabase");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(dir, file), "utf8");
    if (/create or replace function public\.ile_handle_new_user/i.test(sql)) {
      assert.match(sql, /in \('tenant', 'landlord'\)/, file);
    }
  }
});

test("every SQL function body is quoted with $$ on both ends", () => {
  const dir = join(import.meta.dirname, "..", "..", "supabase");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const lines = readFileSync(join(dir, file), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      assert.doesNotMatch(line, /^\s*\$;?\s*$/, `${file}:${i + 1} has a lone $`);
      assert.doesNotMatch(line, /\bas \$\s*$/, `${file}:${i + 1} opens with a single $`);
      assert.doesNotMatch(line, /\$\$\$/, `${file}:${i + 1} has three or more $ in a row`);
    });
    const opens = lines.filter((l) => /\b(as|do) \$\$\s*$/.test(l)).length;
    const closes = lines.filter((l) => /^\s*\$\$;\s*$/.test(l)).length;
    assert.equal(opens, closes, `${file}: ${opens} bodies opened, ${closes} closed`);
  }
});

// guard_inspection_update (review_fixes.sql) rejects tenant updates that keep
// the status, so booking credit must not be written onto inspections rows.
test("booking credit is stored without updating the booking", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "referrals_boosts.sql"), "utf8");
  const body = sql.match(/function public\.record_booking_ref[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.ok(body, "record_booking_ref is defined");
  assert.doesNotMatch(body, /update public\.inspections/i);
  assert.match(body, /insert into public\.booking_refs/i);
});

// Re-running an older migration must not bring back a new-user function that
// forgets invite codes; only referrals_boosts.sql defines it now.
test("only referrals_boosts.sql defines the new-user function, and it records who invited them", () => {
  const dir = join(import.meta.dirname, "..", "..", "supabase");
  const definers = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => /create or replace function public\.ile_handle_new_user/i.test(readFileSync(join(dir, f), "utf8")));
  assert.deepEqual(definers, ["referrals_boosts.sql"]);
  assert.match(readFileSync(join(dir, "referrals_boosts.sql"), "utf8"), /referred_by/);
});

// Rewards are checked hourly, so a burst of sign-ups can straddle two runs.
// The hold rule looks at every 1-hour window starting in the last 2 hours.
test("held-reward check looks at any 1-hour window in the last 2 hours", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "referrals_boosts.sql"), "utf8");
  const body = sql.match(/function public\.ile_add_reward[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.match(body, /interval '2 hours'/);
  assert.match(body, /s\.t \+ interval '1 hour'/);
});

// Notification titles use booking wording; booking_wording.sql carries the
// same two functions so the founder can update the live database.
test("notifications say booking, and booking_wording.sql matches push_notifications.sql", () => {
  const dir = join(import.meta.dirname, "..", "..", "supabase");
  const push = readFileSync(join(dir, "push_notifications.sql"), "utf8");
  const wording = readFileSync(join(dir, "booking_wording.sql"), "utf8");
  const fn = (sql, name) => sql.match(new RegExp(`create or replace function public\\.${name}\\(\\)[\\s\\S]*?\\n\\$\\$;`))?.[0];
  for (const name of ["ile_notify_inspection", "ile_viewing_reminders"]) {
    const body = fn(push, name);
    assert.ok(body, name);
    assert.doesNotMatch(body, /'[^']*\b[Vv]iewing\b[^']*'|wants to view/, name);
    assert.equal(fn(wording, name)?.replace(/\r/g, ""), body.replace(/\r/g, ""), `${name} matches`);
  }
});

test("stays.sql blocks overlapping accepted stays and locks the listing when accepting", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "stays.sql"), "utf8");
  const respond = sql.match(/function public\.respond_stay[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.ok(respond, "respond_stay is defined");
  assert.match(respond, /for update/);
  assert.match(respond, /check_in < [\s\S]*check_out >/);
  const request = sql.match(/function public\.request_stay[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.match(request, /Some of those dates are already booked\./);
  assert.match(request, /Stays can be up to 90 nights\./);
});

test("stay reviews keep viewing reviews deletable and survive their stay", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "stays.sql"), "utf8");
  assert.match(sql, /check \(inspection_id is null or stay_booking_id is null\)/);
  assert.match(sql, /stay_booking_id uuid references public\.stay_bookings \(id\) on delete set null/);
  assert.match(sql, /function public\.my_reviewed_stays/);
  const respond = sql.match(/function public\.respond_stay[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.match(respond, /where id = p_id and status = 'requested'/);
});

test("profiles_privacy.sql opens public rows but never grants phone to readers", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "profiles_privacy.sql"), "utf8");
  assert.match(sql, /on public\.profiles for select to anon, authenticated\s+using \(true\)/);
  for (const grant of sql.match(/grant select \([\s\S]*?\) on public\.profiles[^;]*;/g) || []) {
    assert.doesNotMatch(grant, /\bphone\b/, grant);
  }
  const contact = sql.match(/function public\.booking_contact[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.match(contact, /'confirmed'/);
  assert.match(contact, /'accepted'/);
  assert.match(contact, /auth\.uid\(\)/);
});

test("profiles_privacy.sql hides full_name behind a public_name column", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "profiles_privacy.sql"), "utf8");
  assert.match(sql, /add column if not exists public_name text generated always as/);
  assert.match(sql, /revoke select \(full_name\) on public\.profiles from anon, authenticated;/);
  assert.match(sql, /grant select \([^)]*public_name[^)]*\) on public\.profiles to anon, authenticated;/);
  for (const grant of sql.match(/grant select \([\s\S]*?\) on public\.profiles[^;]*;/g) || []) {
    assert.doesNotMatch(grant, /\bfull_name\b/, grant);
  }
  const first = sql.match(/function public\.ile_first_name[\s\S]*?\n\$\$;/)?.[0] || "";
  assert.match(first, /show_as/);
});

test("profiles_privacy.sql tidies old-format phones before the phone check", () => {
  const sql = readFileSync(join(import.meta.dirname, "..", "..", "supabase", "profiles_privacy.sql"), "utf8");
  assert.ok(sql.indexOf("set phone = '+234'") > 0 && sql.indexOf("set phone = '+234'") < sql.indexOf("add constraint profiles_phone_check"));
});
