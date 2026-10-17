import { test } from "node:test";
import assert from "node:assert/strict";
import { readFilters, nextParams, buildQuery, applyFilterChange, fetchLatestListings, listingsHeading, SEARCH_TABS, searchTypeOptions, isLandSearch, browsePath } from "../search.js";

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
  assert.equal(nextParams({ tab: "rent", ptype: "flat" }, { tab: "commercial" }).get("ptype"), null);
  assert.equal(nextParams({ state: "Lagos", lga: "Ikeja" }, { state: "Oyo" }).get("lga"), null);
});

test("builds a safe rent search query", () => {
  const client = fakeClient();
  buildQuery(client, { tab: "rent", q: "yaba, (x)" });
  const has = (...call) => client.calls.some((c) => JSON.stringify(c) === JSON.stringify(call));
  assert.ok(has("eq", "status", "active"));
  assert.ok(has("in", "category", ["homes", "land"]));
  assert.ok(has("eq", "listing_type", "rent"));
  const or = client.calls.find((c) => c[0] === "or")[1];
  assert.ok(or.includes("title.ilike.%yaba"));
  assert.ok(!/yaba,|\(x\)/.test(or), "user text must not inject , or ()");
  assert.deepEqual(client.calls.at(-1), ["range", 0, 23]);
});

test("applyFilterChange clears home-only filters when the tab changes", () => {
  const start = readFilters(new URLSearchParams("beds=3&ptype=flat&state=Lagos"));
  const f = applyFilterChange(start, { tab: "commercial" });
  assert.equal(f.tab, "commercial");
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

test("fetchLatestListings asks for fresh active listings, newest first", async () => {
  const calls = [];
  const builder = new Proxy({}, { get: (_, m) => (...a) => { calls.push([m, ...a]); return m === "limit" ? Promise.resolve({ data: [{ id: 1 }], error: null }) : builder; } });
  const client = { from: (t) => { calls.push(["from", t]); return builder; } };
  const rows = await fetchLatestListings(client);
  assert.deepEqual(rows, [{ id: 1 }]);
  assert.deepEqual(calls[0], ["from", "listings"]);
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "status" && c[2] === "active"));
  assert.ok(calls.some((c) => c[0] === "gte" && c[1] === "last_confirmed_at"));
  assert.ok(calls.some((c) => c[0] === "order" && c[1] === "created_at" && c[2].ascending === false));
  assert.deepEqual(calls.at(-1), ["limit", 8]);
});

test("listingsHeading names the place, the search text or Nigeria", () => {
  const f = (v) => readFilters(new URLSearchParams(v));
  assert.equal(listingsHeading(f({ tab: "rent" })), "Homes for rent in Nigeria");
  assert.equal(listingsHeading(f({ tab: "sale", state: "FCT" })), "Homes for sale in FCT (Abuja)");
  assert.equal(listingsHeading(f({ tab: "commercial", state: "Lagos", lga: "Eti-Osa" })), "Commercial property in Eti-Osa, Lagos");
  assert.equal(listingsHeading(f({ tab: "rent", q: "Lekki" })), 'Homes for rent matching "Lekki"');
});

test("buildQuery orders boosted listings first", () => {
  const client = fakeClient();
  buildQuery(client, { tab: "rent", sort: "low" });
  const orders = client.calls.filter((c) => c[0] === "order");
  assert.equal(orders[0][1], "boosted_until");
  assert.deepEqual(orders[0][2], { ascending: false, nullsFirst: false });
  assert.equal(orders[1][1], "price");
});

test("fetchLatestListings orders boosted listings first", async () => {
  const calls = [];
  const builder = new Proxy({}, {
    get: (_, method) =>
      method === "then"
        ? (resolve) => resolve({ data: [], error: null })
        : (...args) => {
            calls.push([method, ...args]);
            return builder;
          },
  });
  await fetchLatestListings({ from: () => builder });
  const orders = calls.filter((c) => c[0] === "order");
  assert.equal(orders[0][1], "boosted_until");
  assert.equal(orders[1][1], "created_at");
});

// Before supabase/referrals_boosts.sql is run, listings has no boosted_until.
function clientMissingBoostColumn() {
  const runs = [];
  return {
    runs,
    from: () => {
      const calls = [];
      runs.push(calls);
      const builder = new Proxy({}, {
        get: (_, method) =>
          method === "then"
            ? (resolve) =>
                resolve(
                  calls.some((c) => c[0] === "order" && c[1] === "boosted_until")
                    ? { data: null, count: null, error: { code: "42703", message: "column listings.boosted_until does not exist" } }
                    : { data: [{ id: "l1" }], count: 1, error: null }
                )
            : (...args) => {
                calls.push([method, ...args]);
                return builder;
              },
      });
      return builder;
    },
  };
}

test("search still works before the boost column exists", async () => {
  const client = clientMissingBoostColumn();
  const { data, error } = await buildQuery(client, { tab: "rent" });
  assert.equal(error, null);
  assert.deepEqual(data, [{ id: "l1" }]);
});

test("Fresh on Ile still works before the boost column exists", async () => {
  const rows = await fetchLatestListings(clientMissingBoostColumn());
  assert.deepEqual(rows, [{ id: "l1" }]);
});

test("search tabs are Rent, Buy, Shortlets and Commercial", () => {
  assert.deepEqual(SEARCH_TABS.map((t) => t.label), ["Rent", "Buy", "Shortlets", "Commercial"]);
});

test("old Land links open Buy filtered to land", () => {
  const f = readFilters(new URLSearchParams("tab=land&state=Lagos"));
  assert.equal(f.tab, "sale");
  assert.equal(f.ptype, "land");
  assert.equal(f.state, "Lagos");
  assert.equal(readFilters(new URLSearchParams("tab=land&ptype=farmland")).ptype, "farmland");
});

test("Rent and Buy include land; the Land type filter shows only land", () => {
  const all = fakeClient();
  buildQuery(all, { tab: "sale" });
  assert.ok(all.calls.some((c) => c[0] === "in" && c[1] === "category" && c[2].join() === "homes,land"));
  const land = fakeClient();
  buildQuery(land, { tab: "rent", ptype: "land" });
  assert.ok(land.calls.some((c) => c[0] === "eq" && c[1] === "category" && c[2] === "land"));
  assert.ok(!land.calls.some((c) => c[0] === "eq" && c[1] === "property_type"));
  assert.equal(listingsHeading(readFilters(new URLSearchParams("tab=sale&ptype=land"))), "Land for sale in Nigeria");
});

test("Rent and Buy offer home types, then any land, then each land type", () => {
  const values = searchTypeOptions("sale").map((o) => o.value);
  assert.equal(values[0], "flat");
  assert.ok(values.indexOf("land") > values.indexOf("terrace"));
  assert.ok(values.indexOf("farmland") > values.indexOf("land"));
  assert.equal(searchTypeOptions("sale").find((o) => o.value === "land").label, "Land (any)");
  assert.deepEqual(searchTypeOptions("commercial").map((o) => o.value), ["shop", "office", "warehouse"]);
});

test("isLandSearch is true for any land filter", () => {
  assert.equal(isLandSearch({ tab: "sale", ptype: "land" }), true);
  assert.equal(isLandSearch({ tab: "rent", ptype: "farmland" }), true);
  assert.equal(isLandSearch({ tab: "rent", ptype: "flat" }), false);
  assert.equal(isLandSearch({ tab: "rent" }), false);
});

test("browsePath points a listing's breadcrumb at the matching search", () => {
  assert.equal(browsePath({ category: "homes", listing_type: "rent" }), "/listings");
  assert.equal(browsePath({ category: "homes", listing_type: "sale" }), "/listings?tab=sale");
  assert.equal(browsePath({ category: "land", listing_type: "sale" }), "/listings?tab=sale&ptype=land");
  assert.equal(browsePath({ category: "land", listing_type: "rent" }), "/listings?ptype=land");
  assert.equal(browsePath({ category: "commercial", listing_type: "rent" }), "/listings?tab=commercial");
});

function stayClient(rpcResult) {
  const calls = [];
  const builder = new Proxy({}, {
    get: (_, method) =>
      method === "then"
        ? (resolve) => resolve({ data: [{ id: "x" }], count: 1, error: null })
        : (...args) => {
            calls.push([method, ...args]);
            return builder;
          },
  });
  return {
    calls,
    from: () => builder,
    rpc: async (name, args) => {
      calls.push(["rpc", name, args]);
      return rpcResult;
    },
  };
}

test("stays search filters by guests, amenities and free dates", async () => {
  const client = stayClient({ data: ["a", "b"], error: null });
  await buildQuery(client, readFilters(new URLSearchParams("tab=stays&guests=3&amen=Wi-Fi,Kitchen&checkin=2026-11-05&checkout=2026-11-08")));
  const has = (...call) => client.calls.some((c) => JSON.stringify(c) === JSON.stringify(call));
  assert.ok(has("eq", "category", "stays"));
  assert.ok(has("gte", "max_guests", 3));
  assert.ok(has("contains", "features", ["Wi-Fi", "Kitchen"]));
  assert.ok(has("rpc", "stays_unavailable", { p_check_in: "2026-11-05", p_check_out: "2026-11-08" }));
  assert.ok(has("not", "id", "in", "(a,b)"));
});

test("stays search ignores bad dates and still works when stays_unavailable is missing", async () => {
  const missing = stayClient({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
  const { data } = await buildQuery(missing, readFilters(new URLSearchParams("tab=stays&checkin=2026-11-05&checkout=2026-11-08")));
  assert.deepEqual(data, [{ id: "x" }]);
  assert.ok(!missing.calls.some((c) => c[0] === "not"));
  const bad = stayClient({ data: ["a"], error: null });
  await buildQuery(bad, readFilters(new URLSearchParams("tab=stays&checkin=2026-11-08&checkout=2026-11-05")));
  assert.ok(!bad.calls.some((c) => c[0] === "rpc"));
});

test("changing tab clears stay filters", () => {
  const p = nextParams({ tab: "stays", guests: "2", checkin: "2026-11-05", checkout: "2026-11-08", amen: "Wi-Fi" }, { tab: "rent" });
  for (const k of ["guests", "checkin", "checkout", "amen"]) assert.equal(p.get(k), null, k);
});

test("stays tab: type options, heading and breadcrumb", () => {
  assert.deepEqual(searchTypeOptions("stays").map((o) => o.value), ["shortlet", "hotel_room", "airbnb"]);
  assert.equal(listingsHeading(readFilters(new URLSearchParams("tab=stays"))), "Shortlets & hotels in Nigeria");
  assert.equal(browsePath({ category: "stays", listing_type: "rent" }), "/listings?tab=stays");
});
