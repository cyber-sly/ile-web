import { test } from "node:test";
import assert from "node:assert/strict";
import { readFilters, nextParams, buildQuery, applyFilterChange } from "../search.js";

// Records every builder call so the query can be checked without a database.
function fakeClient() {
  const calls = [];
  const builder = new Proxy({}, {
    get: (_, method) => (...args) => {
      calls.push([method, ...args]);
      return builder;
    },
  });
  return { calls, from: (table) => { calls.push(["from", table]); return builder; } };
}

test("reads legacy type and location params", () => {
  const f = readFilters(new URLSearchParams("type=sale&location=Yaba"));
  assert.equal(f.tab, "sale");
  assert.equal(f.q, "Yaba");
});

test("clears filters that no longer apply", () => {
  assert.equal(nextParams({ tab: "rent", ptype: "flat" }, { tab: "land" }).get("ptype"), null);
  assert.equal(nextParams({ state: "Lagos", lga: "Ikeja" }, { state: "Oyo" }).get("lga"), null);
});

test("builds a safe rent search query", () => {
  const client = fakeClient();
  buildQuery(client, { tab: "rent", q: "yaba, (x)" });
  const has = (...call) => client.calls.some((c) => JSON.stringify(c) === JSON.stringify(call));
  assert.ok(has("eq", "status", "active"));
  assert.ok(has("eq", "category", "homes"));
  assert.ok(has("eq", "listing_type", "rent"));
  const or = client.calls.find((c) => c[0] === "or")[1];
  assert.ok(or.includes("title.ilike.%yaba"));
  assert.ok(!/yaba,|\(x\)/.test(or), "user text must not inject , or ()");
  assert.deepEqual(client.calls.at(-1), ["range", 0, 23]);
});

test("applyFilterChange clears home-only filters when the tab changes", () => {
  const start = readFilters(new URLSearchParams("beds=3&ptype=flat&state=Lagos"));
  const f = applyFilterChange(start, { tab: "land" });
  assert.equal(f.tab, "land");
  assert.equal(f.beds, "");
  assert.equal(f.ptype, "");
  assert.equal(f.state, "Lagos");
});

test("applyFilterChange clears the LGA when the state changes", () => {
  const start = readFilters(new URLSearchParams("state=Lagos&lga=Eti-Osa"));
  assert.equal(applyFilterChange(start, { state: "Oyo" }).lga, "");
});

test("applyFilterChange keeps rent as the default tab", () => {
  const start = readFilters(new URLSearchParams("tab=sale"));
  assert.equal(applyFilterChange(start, { tab: "rent" }).tab, "rent");
});

test("applyFilterChange keeps an LGA sent together with a new state", () => {
  const start = readFilters(new URLSearchParams(""));
  const f = applyFilterChange(start, { state: "Lagos", lga: "Eti-Osa" });
  assert.equal(f.state, "Lagos");
  assert.equal(f.lga, "Eti-Osa");
});
