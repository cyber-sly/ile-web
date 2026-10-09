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
