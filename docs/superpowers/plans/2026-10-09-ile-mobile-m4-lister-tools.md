# Ile Mobile — Milestone 4: Lister Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Listers can run their listings from the app: a Dashboard with their listings and viewing requests (confirm, suggest a time, decline, mark done, message), a step-by-step listing wizard with camera photos and "Use my location", editing, and weekly viewing times.

**Architecture:** The website's lister rules (form ↔ row mapping, validation, request and listing actions, availability rows) move into `shared/lister.js`, tested with `node --test`, and the website switches to them. The app adds the Dashboard tab, the wizard (`list/new`, `list/[id]/edit`) with an autosaved local draft, a photo pipeline (pick or shoot → resize to 1600px JPEG 0.8 → copy into app storage → upload one at a time with retry), and the viewing-times screen. Same tables, RLS, storage rules and RPCs as the website.

**Tech Stack:** Expo SDK 57, Expo Router, TanStack Query (M2), `expo-image-picker`, `expo-image-manipulator`, `expo-file-system` (installed), `expo-location` (M2), Supabase Storage, jest-expo + react-test-renderer, Node `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-09-ile-mobile-app-design.md` (build step 6; sections 2 and 4)

**Previous milestone:** `docs/superpowers/plans/2026-10-09-ile-mobile-m3-booking-chat.md` (merged to `main` at bd05210).

## Global Constraints

- Every M1–M3 Global Constraint still applies (platform-free `shared/`, `npx expo install`, anon key only, theme tokens, commit trailer, never stage `brag-output/`).
- No schema changes. Writes use exactly what the website uses: `listings` insert/update/delete (RLS: own rows), `inspections` update (lister actions), `set_listing_availability(p_listing, p_minutes, p_windows)`, `listing_open_slots`, `tenant_details(p_ids)`, storage buckets `listing-images` (JPEG/PNG/WebP/HEIC/HEIF, ≤10 MB) and `listing-videos` (MP4/MOV/WebM, ≤50 MB), files under `<user id>/`.
- Limits copied from the website: `MAX_PHOTOS = 20`, `MAX_PHOTO_MB = 10`, `MAX_VIDEOS = 5`, `MAX_VIDEO_MB = 50`; title 1–120 characters, description ≤ 5000.
- Photos are resized on the phone to a longest side of 1600 px, JPEG quality 0.8 (spec §4), always uploaded as `image/jpeg` (HEIC is converted). Stored name: `<userId>/<timestamp>-<random>.jpg`. Videos are never transcoded; files over 50 MB are refused before upload.
- Saving a listing sets `last_confirmed_at` to now and `image_url` to the first photo, exactly like the website. Photos removed while editing are deleted from storage only after the save succeeds.
- "Taken" status: `sold` for sale listings, `let` otherwise. Moderated listings (`under_review`, `removed`) get no lister status actions.
- Lister request actions: pending → Confirm / Suggest another time / Decline; countered → Withdraw; confirmed → Mark as done (on or after the date) or Cancel (before it). Suggested time: date today or later (Nigeria time), optional time, optional note ≤ 300 characters.
- Viewing times: weekdays Monday-first with Postgres values (0 = Sunday), slot lengths 15/30/45/60 minutes, default window 10:00–14:00, each day's end after its start.
- Live-only actions (publish, save, upload, request actions, viewing times) are disabled offline with "This needs a connection."
- Website gate after every task touching `shared/` or `src/`: `npm run test:shared`, `npm run lint`, `npm run build`. Mobile gate after every task: `npx jest`, `npx tsc --noEmit`, `npx expo lint`.

## Review Focus

- **Upload fails halfway on weak data:** no listing is saved with missing photos; tapping Publish again re-uploads only the photos that didn't make it — pinned by Task 3 `uploadQueue` tests.
- **App killed in the middle of the wizard:** reopening "List a property" restores the draft including picked photos (files copied into app storage, not the picker's temporary cache) — pinned by Task 4 `draftStore` tests.
- **Editing: photos removed or reordered:** the saved order is the order on screen, the first photo becomes the cover, and removed photos are deleted from storage only after the save succeeds — pinned by Task 1 `mediaChanges` tests.
- **Suggesting a time in the past, or a viewing day whose end is before its start:** blocked with a clear message before anything is sent — pinned by Task 1 `validateCounter` and `availabilityRows` tests.
- **A lister opens the edit or viewing-times screen for someone else's listing (old link, account switch):** "You can only edit your own listings", nothing loads into the form — pinned by Task 4's ownership check on load.

---

### Task 1: Shared lister rules (website switches to them)

**Files:**
- Create: `shared/lister.js`, `shared/__tests__/lister.test.js`
- Modify: `shared/people.js` (add `fetchTenantDetails(client, ids)`), `src/lib/profile.js` (delegate it), `src/components/ListingForm.jsx` (use `EMPTY_DRAFT`, `draftFromListing`, `draftToRow`, `validateDraft`, limits), `src/app/dashboard/page.jsx` (use `requestActions`, `listingActions`, `takenStatus`), `src/app/listings/[id]/viewings/page.jsx` (use `WEEKDAYS`, `SLOT_LENGTHS`, `DEFAULT_WINDOW`, `availabilityRows`)

**Interfaces (Produces, `shared/lister.js`):**
- `MAX_PHOTOS`, `MAX_PHOTO_MB`, `MAX_VIDEOS`, `MAX_VIDEO_MB`, `MAX_TITLE = 120`, `MAX_DESCRIPTION = 5000`, `MAX_NOTE = 300`
- `EMPTY_DRAFT` (the website's `EMPTY`), `draftFromListing(listing)` (website `fromListing`), `draftToRow(draft) -> row` (website `row`, without media), `validateDraft(draft) -> { [field]: message }` (website `validate`, plus title ≤ 120 and description ≤ 5000)
- `mediaChanges(originalUrls, keptUrls, uploadedUrls) -> { urls, cover, removed }` (urls = kept then uploaded, in screen order; cover = urls[0] ?? null; removed = originals not kept)
- `takenStatus(listing) -> "sold" | "let"`; `listingActions(listing) -> { confirm, markTaken, relist, edit, times, remove }` (confirm when `needsConfirming`; markTaken when available and not moderated; relist when not available and not moderated; edit/times/remove when not moderated — remove is always allowed)
- `requestActions(inspection) -> { confirm, counter, decline, done, cancel, withdraw }` per the Global Constraints
- `validateCounter({ date, time, note }, today) -> string | null` ("Pick a date from today on." / "Keep the note under 300 characters.")
- `WEEKDAYS`, `SLOT_LENGTHS`, `DEFAULT_WINDOW`; `availabilityRows(days) -> { rows, error }` (rows for days that are on; error "Each day's end time must be after its start time." when any end ≤ start)
- Queries: `fetchMyListings(client, userId)`, `fetchRequests(client, listingIds)` (website select), `saveListing(client, row, { id, userId }) -> id`, `updateListing(client, id, changes)`, `deleteListing(client, id)`, `fetchAvailability(client, id) -> { listing, windows }`, `saveAvailability(client, id, minutes, rows) -> openSlotCount`

- [ ] **Step 1: Write failing tests** (`lister.test.js`)
  - `draftToRow maps a home draft like the website` — rent flat in Lagos/Eti-Osa, area "Lekki Phase 1", 2 beds → `location "Lekki Phase 1, Lagos"`, `bedrooms 2`, `title_document null`, `caution_deposit` number.
  - `draftToRow drops home-only fields for land` — land draft → `bedrooms 0`, `bathrooms null`, `furnishing null`, `size_unit` from the draft.
  - `draftFromListing round-trips through draftToRow`.
  - `validateDraft requires state, LGA, title, price and bedrooms for homes`; `validateDraft requires plot size for land`; `validateDraft rejects fees over 100% and titles over 120 characters`.
  - `mediaChanges keeps screen order, picks the first as cover, and lists removed photos` — originals `[a,b,c]`, kept `[c,a]`, uploaded `[d]` → urls `[c,a,d]`, cover `c`, removed `[b]`.
  - `takenStatus is sold for sales and let otherwise`.
  - `listingActions offers confirm when the listing needs confirming` (confirmed 31 days ago); `listingActions offers relist for a let listing`; `listingActions offers no status actions on a moderated listing` (`under_review` → markTaken false, relist false, remove true).
  - `requestActions for a pending request`; `requestActions for a confirmed viewing before and on its date` (cancel before, done on); `requestActions for a countered request is withdraw only`.
  - `validateCounter blocks a past date and long notes`.
  - `availabilityRows returns rows for days that are on`; `availabilityRows blocks an end before the start`.
- [ ] **Step 2: Run** `npm run test:shared` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** by moving the website's code; switch the four website files; add `fetchTenantDetails` to `shared/people.js`.
- [ ] **Step 4: Run** the website gate; smoke `next start`: `/dashboard`, `/listings/new`, `/listings/<id>/edit`, `/listings/<id>/viewings` return 200.
- [ ] **Step 5: Commit** `refactor(shared): lister rules shared by web and app`

---

### Task 2: Dashboard tab for listers

**Files:**
- Modify: `mobile/src/app/(tabs)/viewings.tsx` (listers get the Dashboard in this same tab; no new tab)
- Create: `mobile/src/components/dashboard/ListingRow.tsx`, `mobile/src/components/dashboard/RequestCard.tsx`, `mobile/src/components/dashboard/CounterSheet.tsx`, `mobile/src/app/my-viewings.tsx` (the home-seeker viewings list, reused for listers' own bookings)
- Modify: `mobile/src/lib/queryClient.ts` (persist `["dashboard", userId]`), its test; `mobile/src/app/_layout.tsx` (register `my-viewings`)

**Interfaces:**
- Consumes: Task 1 queries and actions; `fetchPeople`, `fetchRatings`, `fetchTenantDetails` (`shared/people.js`); `occupationLabel`, `moveInLabel` (`shared/profileDisplay.js`); `openChat(listingId, tenantId)` (M3); `updateViewing` (M3).
- `["dashboard", userId]` query → `{ listings, requests, people, tenantInfo, ratings }`.
- Screen: "Dashboard" title; "List a property" button (→ `/list/new`); tiles (Live listings, Awaiting reply, Confirmed); "Needs your reply" requests first (`sortViewings`); each `RequestCard` shows the home-seeker (avatar, name, rating, occupation and move-in when shared), listing title, date/time, status badge and its `requestActions` buttons; "Suggest another time" opens `CounterSheet` (day chips from `requestDays`, time chips `REQUEST_TIMES`, note field, `validateCounter`); "Message" → `openChat(listing_id, tenant_id)`. "My listings": `ListingRow` (photo, title, price, status line: "Live", "Let · hidden from search", "Not confirmed · hidden from search", "Confirm it's still available"), `listingActions` buttons (Still available, Mark as let/sold, Relist, Edit, Viewing times, Delete with a confirm `Alert`). A row "Viewings you've booked" → `/my-viewings` when the lister has any.
- `shouldPersist` keeps `["dashboard", userId]`.

- [ ] **Step 1: Write failing tests** — `queryClient.test.ts`: `shouldPersist keeps the dashboard`. `mobile/src/components/__tests__/RequestCard.test.tsx` (react-test-renderer, mocks as in M3 tests): `shows Confirm, Suggest and Decline for a pending request`; `shows Withdraw only for a countered request`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): lister dashboard with requests and listings`

---

### Task 3: Photo and video pipeline

**Files:**
- Install: `npx expo install expo-image-picker expo-image-manipulator`
- Modify: `mobile/app.json` (expo-image-picker plugin: `photosPermission: "Ile uses your photos so you can add them to your listing."`, `cameraPermission: "Ile uses your camera so you can take photos of your property."`)
- Create: `mobile/src/lib/media.ts`, `mobile/src/lib/uploadQueue.ts`, `mobile/src/lib/__tests__/media.test.ts`, `mobile/src/lib/__tests__/uploadQueue.test.ts`

**Interfaces:**
- Produces (`media.ts`):
  - `resizeTarget(width, height, max = 1600) -> { width } | { height } | null` (resize the longer side only when over `max`; null when already small enough)
  - `storagePath(userId, ext, now = Date.now(), random = Math.random()) -> string` (`<userId>/<now>-<base36>.<ext>`)
  - `pickPhotos(room) / takePhoto()` → `LocalMedia[]` (`{ uri, kind: "image" }`), each resized (`ImageManipulator`, JPEG 0.8) and copied into `FileSystem.documentDirectory + "drafts/"`; `pickVideos(room)` → `{ uri, kind: "video", size, mime }` (refuses > 50 MB or a type outside MP4/MOV/WebM with a message)
  - `uploadOne(media, userId) -> publicUrl` (reads the file as an ArrayBuffer, uploads to the right bucket with `contentType`, `upsert: false`)
- Produces (`uploadQueue.ts`): `uploadAll(items: { key, media }[], upload, { retries = 2, onProgress }) -> Promise<{ urls: Record<key, string>, failed: key[] }>` — one at a time, each retried up to `retries` times, keys already in `done` (passed in) are skipped, so a second Publish continues where the first stopped.

- [ ] **Step 1: Write failing tests**
  - `resizeTarget shrinks the longer side to 1600` — `(4000, 3000)` → `{ width: 1600 }`; `(3000, 4000)` → `{ height: 1600 }`; `(1200, 900)` → null.
  - `storagePath puts files in the user's folder` — `storagePath("u1", "jpg", 1700000000000, 0.5)` matches `/^u1\/1700000000000-[a-z0-9]+\.jpg$/`.
  - `uploadAll uploads one at a time in order`; `uploadAll retries a failing upload then reports it failed` (always throws → `failed: ["b"]`, others uploaded, 3 attempts for b); `uploadAll skips items already uploaded` (done `{a: url}` → upload not called for a).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; install packages; add the permission plugin.
- [ ] **Step 4: Run** the mobile gate and `npx expo-doctor`.
- [ ] **Step 5: Commit** `feat(mobile): photo and video picking, resizing and uploads`

---

### Task 4: Listing wizard (new and edit)

**Files:**
- Create: `mobile/src/app/list/new.tsx`, `mobile/src/app/list/[id]/edit.tsx`, `mobile/src/components/wizard/ListingWizard.tsx`, `mobile/src/components/wizard/steps/{What,Where,Details,Price,Photos,Review}.tsx`, `mobile/src/lib/draftStore.ts`, `mobile/src/lib/__tests__/draftStore.test.ts`, `mobile/src/lib/__tests__/wizardSteps.test.ts`, `mobile/src/lib/wizardSteps.ts`
- Modify: `mobile/src/app/_layout.tsx` (register routes), `mobile/src/components/ListingActions.tsx` (owner sees "Edit listing" and "Viewing times" instead of nothing)

**Interfaces:**
- Consumes: Task 1 (`EMPTY_DRAFT`, `draftFromListing`, `draftToRow`, `validateDraft`, `mediaChanges`, `saveListing`, limits); Task 3 (media, `uploadAll`); `findNearMe` (M2); `moveInCost`, `feeWarning`, `PROPERTY_TYPES`, `CATEGORIES`, `LISTER_TYPES`, `FURNISHING`, `TITLE_DOCUMENTS`, `SIZE_UNITS`, `periodOptions` (`shared/property.js`); `NIGERIA`, `STATES` (`shared/nigeria.js`); `SelectField`, `Chip`, `Field` (M1/M2).
- Produces (`wizardSteps.ts`): `STEPS = ["what", "where", "details", "price", "photos", "review"]`; `stepErrors(step, draft, photoCount) -> { [field]: message }` (the `validateDraft` errors that belong to that step; photos step requires at least 1 photo: "Add at least one photo.").
- Produces (`draftStore.ts`): `createDraftStore(storage)` → `{ load(key): Promise<Draft | null>; save(key, draft): Promise<void>; clear(key): Promise<void> }` where `Draft = { values, media: LocalMedia[], kept: string[], uploaded: Record<string,string>, step }`; key `"new"` or `"edit:<id>"`; saves are debounced 500 ms by the wizard; app instance uses AsyncStorage keys `ile:draft:<key>`.
- Wizard: a progress bar ("Step 2 of 6"), Back/Next; Next runs `stepErrors`. Where: "Use my location" (`findNearMe`) fills state + LGA. Price: live move-in total and fee warning. Photos: grid with "Take photo" and "Choose photos", per-photo remove, move earlier/later, "Cover" on the first; videos list with remove. Review: summary of every section with "Change" links, then "Publish" (or "Save changes"): `uploadAll` (progress "Uploading photos (2 of 5)…"), `mediaChanges`, `saveListing`, delete removed files, clear the draft, invalidate `["dashboard"]` and `["listing", id]`, open the listing. Failure keeps the draft and the uploaded map so a retry continues.
- Edit loads the listing; if `landlord_id` isn't the user → "You can only edit your own listings" and nothing else.
- Owner on their own listing screen: bar with "Edit listing" (→ `/list/<id>/edit`) and "Viewing times" (→ `/list/<id>/times`).

- [ ] **Step 1: Write failing tests**
  - `draftStore saves and restores a draft with its photos` (in-memory storage).
  - `draftStore keeps new and edit drafts apart`.
  - `stepErrors only reports the current step's fields` — empty draft: `where` → state and LGA; `what` → `{}`.
  - `stepErrors needs at least one photo`.
  - `ListingActions shows Edit and Viewing times to the owner` (extend `ListingActions.test.tsx`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate; phone check: list a home with 3 camera photos, kill the app at the Price step and reopen (draft back), publish on weak data, edit it (reorder, remove one).
- [ ] **Step 5: Commit** `feat(mobile): list and edit a property from the app`

---

### Task 5: Viewing times

**Files:**
- Create: `mobile/src/app/list/[id]/times.tsx`, `mobile/src/components/TimeStepper.tsx`
- Modify: `mobile/src/app/_layout.tsx` (register)

**Interfaces:**
- Consumes: `WEEKDAYS`, `SLOT_LENGTHS`, `DEFAULT_WINDOW`, `availabilityRows`, `fetchAvailability`, `saveAvailability` (Task 1).
- Produces (`TimeStepper.tsx`): `<TimeStepper value="10:00" onChange step={30} min="06:00" max="21:00" />` with − / + buttons (no native picker).
- Screen: title "Viewing times" + listing title; ownership check like the wizard; a row per weekday (switch, start and end steppers when on), "Copy to all days" on the first day that's on; slot length chips; Save (disabled offline) → `availabilityRows` → error or `saveAvailability` → success text from the website ("Saved. N open viewing slots in the next two weeks…" or the no-times text).

- [ ] **Step 1: Write failing test** `mobile/src/components/__tests__/TimeStepper.test.tsx`: `TimeStepper steps by 30 minutes and stops at its limits` — "21:00" + → stays "21:00"; "10:00" − → "09:30".
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full verification (website gate, mobile gate, `npx expo export --platform android`). Phone check: set Mon–Fri 10:00–14:00, 30-minute slots; open the listing as a home-seeker on the website and see the open times.
- [ ] **Step 5: Commit** `feat(mobile): set weekly viewing times from the app`
