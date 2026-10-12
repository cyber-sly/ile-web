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
