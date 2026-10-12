import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_PROFILE_FORM,
  MIN_PASSWORD,
  deleteMyAccount,
  fetchListerProfile,
  formToProfileChanges,
  hasPassword,
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
