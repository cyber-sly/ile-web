import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Wording rules for everything people read on the website and in the app.
const ROOT = join(import.meta.dirname, "..", "..");
const DIRS = ["src", "mobile/src", "shared"].map((d) => join(ROOT, d));

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    if (statSync(path).isDirectory()) return files(path);
    return /\.(jsx?|tsx?)$/.test(name) ? [path] : [];
  });
}

function offenders(pattern) {
  const hits = [];
  for (const file of DIRS.flatMap(files)) {
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
  }
  return hits;
}

test('no "no inspection fees" claims anywhere', () => {
  assert.deepEqual(offenders(/inspection fee|no inspection|inspection or search/i), []);
});

test('the headline says "without wahala"', () => {
  assert.deepEqual(offenders(/without the wahala/i), []);
});

test('bookings, not viewings: "Fix a booking" and booking wording', () => {
  assert.deepEqual(offenders(/book a viewing|book viewing/i), []);
  // Capitalised "Viewing"/"Viewings" as a word only appears in visible text
  // (code names like ViewingCard or MyViewings don't match).
  assert.deepEqual(offenders(/\bViewings?\b/), []);
});

test("listing form offers amenities and stays", () => {
  const form = readFileSync(join(ROOT, "src/components/ListingForm.jsx"), "utf8");
  assert.match(form, /AmenityPicker/);
  assert.match(form, /"stays"/);
  assert.match(form, /Price per night/);
});

test("home page has the four category cards", () => {
  const home = readFileSync(join(ROOT, "src/app/page.js"), "utf8");
  assert.match(home, /"Shortlets & hotels"/);
  assert.match(home, /"Shops & offices"|Shops and offices/);
  assert.doesNotMatch(home, /"Homes for sale"/);
});
