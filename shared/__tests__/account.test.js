import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_PROFILE_FORM,
  MIN_PASSWORD,
  deleteMyAccount,
  fetchListerProfile,
  formToProfileChanges,
  hasPassword,
  verifyPassword,
  leaveReview,
  profileToForm,
  reportListing,
  validateProfileForm,
} from "../account.js";

// Fake client recording calls for account deletion.
function deletionClient({ ready = true, files = {}, failRemove = false } = {}) {
  const calls = [];
  return {
    calls,
    rpc: async (name) => {
      calls.push(`rpc:${name}`);
      if (name === "account_deletion_ready") return { data: ready, error: null };
      return { data: null, error: null };
    },
    storage: {
      from: (bucket) => ({
        list: async (_folder, { offset }) => {
          const all = files[bucket] || [];
          return { data: all.slice(offset, offset + 100).map((name) => ({ id: name, name })), error: null };
        },
        remove: async (paths) => {
          calls.push(`remove:${bucket}:${paths.length}`);
          return { error: failRemove ? { message: "nope" } : null };
        },
      }),
    },
    auth: {
      signOut: async () => {
        calls.push("signOut");
        return { error: null };
      },
    },
  };
}

test("MIN_PASSWORD is 8", () => {
  assert.equal(MIN_PASSWORD, 8);
});

test("deleteMyAccount stops before touching files when deletion isn't ready", async () => {
  const client = deletionClient({ ready: false, files: { avatars: ["a.jpg"] } });
  await assert.rejects(deleteMyAccount(client, "u1"), /Nothing was deleted/);
  assert.deepEqual(client.calls, ["rpc:account_deletion_ready"]);
});

test("deleteMyAccount removes every photo folder, then the account, then signs out", async () => {
  const many = Array.from({ length: 150 }, (_, i) => `p${i}.jpg`);
  const client = deletionClient({ files: { "listing-images": many, avatars: ["me.jpg"] } });
  await deleteMyAccount(client, "u1");
  assert.deepEqual(client.calls, [
    "rpc:account_deletion_ready",
    "remove:listing-images:100",
    "remove:listing-images:50",
    "remove:avatars:1",
    "rpc:delete_my_account",
    "signOut",
  ]);
});

test("deleteMyAccount stops if a photo can't be removed", async () => {
  const client = deletionClient({ files: { avatars: ["me.jpg"] }, failRemove: true });
  await assert.rejects(deleteMyAccount(client, "u1"));
  assert.ok(!client.calls.includes("rpc:delete_my_account"));
});

test("hasPassword spots email accounts", () => {
  assert.equal(hasPassword({ identities: [{ provider: "email" }] }), true);
  assert.equal(hasPassword({ identities: [{ provider: "google" }] }), false);
  assert.equal(hasPassword(null), false);
});

test("profileToForm fills blanks for missing fields", () => {
  const form = profileToForm({ full_name: "Ada", languages: ["Yoruba"] });
  assert.equal(form.full_name, "Ada");
  assert.deepEqual(form.languages, ["Yoruba"]);
  assert.equal(form.bio, "");
  assert.deepEqual(Object.keys(form).sort(), Object.keys(EMPTY_PROFILE_FORM).sort());
});

test("formToProfileChanges keeps lister fields only for listers", () => {
  const form = { ...EMPTY_PROFILE_FORM, full_name: " Ada ", business_name: "Ada Homes", lister_type: "agent" };
  const seeker = formToProfileChanges(form, false, 2026);
  assert.equal(seeker.full_name, "Ada");
  assert.equal("business_name" in seeker, false);
  const lister = formToProfileChanges(form, true, 2026);
  assert.equal(lister.business_name, "Ada Homes");
  assert.equal(lister.lister_type, "agent");
});

test("formToProfileChanges drops an out-of-range listing year", () => {
  assert.equal(formToProfileChanges({ ...EMPTY_PROFILE_FORM, full_name: "A", listing_since: "1900" }, true, 2026).listing_since, null);
  assert.equal(formToProfileChanges({ ...EMPTY_PROFILE_FORM, full_name: "A", listing_since: "2015" }, true, 2026).listing_since, 2015);
});

test("validateProfileForm requires a name and enforces limits", () => {
  assert.ok(validateProfileForm({ ...EMPTY_PROFILE_FORM }).full_name);
  const er = validateProfileForm({ ...EMPTY_PROFILE_FORM, full_name: "A", bio: "x".repeat(301), languages: Array(9).fill("English") });
  assert.ok(er.bio);
  assert.ok(er.languages);
  assert.deepEqual(validateProfileForm({ ...EMPTY_PROFILE_FORM, full_name: "Ada" }), {});
});

test("leaveReview needs a star rating", async () => {
  await assert.rejects(leaveReview({ rpc: async () => ({ error: null }) }, { inspectionId: "i1", rating: 0 }), { message: "Choose a star rating." });
});

test("leaveReview sends the review", async () => {
  const calls = [];
  await leaveReview({ rpc: async (n, a) => (calls.push([n, a]), { error: null }) }, { inspectionId: "i1", rating: 5, comment: "Great", accurate: true });
  assert.deepEqual(calls, [["leave_review", { p_inspection: "i1", p_rating: 5, p_comment: "Great", p_accurate: true }]]);
});

test("reportListing explains a repeat report", async () => {
  const client = { from: () => ({ insert: async () => ({ error: { code: "23505", message: "duplicate" } }) }) };
  await assert.rejects(reportListing(client, { listingId: "l1", userId: "u1", reason: "scam" }), {
    message: "You've already reported this listing. We're looking into it.",
  });
});

test("fetchListerProfile returns null for a malformed id without a request", async () => {
  let called = false;
  const client = { from: () => ((called = true), {}), rpc: () => ((called = true), {}) };
  assert.equal(await fetchListerProfile(client, "not-a-uuid"), null);
  assert.equal(called, false);
});

test("verifyPassword is false only for a wrong password", async () => {
  const answer = (error) => ({ auth: { signInWithPassword: async () => ({ error }) } });
  assert.equal(await verifyPassword(answer(null), "a@b.c", "right"), true);
  assert.equal(await verifyPassword(answer({ message: "Invalid login credentials", status: 400 }), "a@b.c", "wrong"), false);
  await assert.rejects(verifyPassword(answer({ message: "email rate limit exceeded", status: 429 }), "a@b.c", "right"), /rate limit/);
  await assert.rejects(verifyPassword(answer({ message: "Network request failed" }), "a@b.c", "right"), /Network/);
});

function profileClient(profile, { missingColumns = false } = {}) {
  const selects = [];
  const chain = (result) => {
    const b = new Proxy({}, {
      get: (_, m) => (m === "then" ? (resolve) => resolve(result) : m === "maybeSingle" ? async () => result : () => b),
    });
    return b;
  };
  return {
    selects,
    rpc: async () => ({ data: [], error: null }),
    from: (table) => ({
      select: (cols) => {
        selects.push([table, cols]);
        if (table !== "profiles") return chain({ data: [], error: null });
        if (missingColumns && cols.includes("username")) return chain({ data: null, error: { code: "42703", message: "column profiles.username does not exist" } });
        return chain({ data: profile, error: null });
      },
    }),
  };
}

const PROFILE_ID = "6f2c3a1e-1111-4222-8333-444455556666";

test("fetchListerProfile returns a home-seeker's basic profile with their display name", async () => {
  const data = await fetchListerProfile(profileClient({ id: PROFILE_ID, full_name: "Ada", username: "ada", show_as: "username", role: "tenant" }), PROFILE_ID);
  assert.equal(data.profile.display_name, "@ada");
  assert.equal(data.profile.is_lister, false);
  assert.deepEqual(data.listings, []);
  assert.equal(await fetchListerProfile(profileClient(null), PROFILE_ID), null);
});

test("fetchListerProfile still works before the username columns exist", async () => {
  const client = profileClient({ id: PROFILE_ID, full_name: "Bayo", role: "landlord" }, { missingColumns: true });
  const data = await fetchListerProfile(client, PROFILE_ID);
  assert.equal(data.profile.display_name, "Bayo");
  assert.equal(data.profile.is_lister, true);
});

test("validateProfileForm refuses show_as username without a username", () => {
  const v = { ...EMPTY_PROFILE_FORM, full_name: "Ada", show_as: "username", username: "" };
  assert.equal(validateProfileForm(v).show_as, "Choose a username first.");
  assert.equal(validateProfileForm({ ...v, username: "ada_o" }).show_as, undefined);
});

test("validateProfileForm checks username and phone formats", () => {
  const v = { ...EMPTY_PROFILE_FORM, full_name: "Ada" };
  assert.equal(validateProfileForm({ ...v, username: "a-b" }).username, "Use 3 to 20 letters, numbers or underscores.");
  assert.equal(validateProfileForm({ ...v, phone: "12345" }).phone, "Enter a Nigerian number, e.g. 0803 123 4567.");
  assert.deepEqual(validateProfileForm({ ...v, username: "Ada_O", phone: "0803 123 4567" }), {});
});

test("profile row saves the normalised username and phone only when supported", () => {
  const v = { ...EMPTY_PROFILE_FORM, full_name: "Ada", username: " @Ada_O ", show_as: "username", phone: "0803 123 4567" };
  const row = formToProfileChanges(v, false, 2026, true);
  assert.equal(row.username, "ada_o");
  assert.equal(row.show_as, "username");
  assert.equal(row.phone, "+2348031234567");
  const cleared = formToProfileChanges({ ...v, username: "", show_as: "name", phone: "" }, false, 2026, true);
  assert.equal(cleared.username, null);
  assert.equal(cleared.phone, null);
  assert.equal("username" in formToProfileChanges(v, false, 2026), false);
  assert.equal(profileToForm({ full_name: "Ada", phone: "+2348031234567", show_as: "username", username: "ada" }).phone, "0803 123 4567");
});

test("fetchListerProfile reads the public name and falls back on any error", async () => {
  const client = profileClient({ id: PROFILE_ID, full_name: "Bayo", role: "landlord" });
  await fetchListerProfile(client, PROFILE_ID);
  assert.match(client.selects.find(([t]) => t === "profiles")[1], /full_name:public_name/);

  const denied = profileClient({ id: PROFILE_ID, full_name: "Bayo", role: "landlord" });
  const from = denied.from;
  denied.from = (table) => {
    const q = from(table);
    return {
      select: (cols) =>
        table === "profiles" && cols.includes("public_name")
          ? { eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: "42501", message: "permission denied" } }) }) }
          : q.select(cols),
    };
  };
  assert.equal((await fetchListerProfile(denied, PROFILE_ID)).profile.display_name, "Bayo");
});
