# Testing: real results

## v3.0.0 Aurora After Dark — current dev branch

The v3 source now includes the fast-booking calendar, one-tap Next open, remembered student details, race-loss alternatives, open-first time lists, teacher Rush Mode, Publish & open day, landscape/rotation responsive work, a TEST-only concurrency harness, and `DEVICE_TEST_V3.md`.

**NOT YET EXECUTED FOR THIS v3 PASS:** `npm run verify`, the new `tests/unit/rush300.test.js`, the real-device matrix, or `npm run test:stress` against conference-TEST. Do not treat these as passed until their actual output is captured.

The concurrency harness deliberately uses holds only: it does not create a booking. It requires an explicit TEST confirmation variable and a disposable future open slot ID. It checks that exactly one concurrent hold wins, the slot becomes Held, and releasing the winning hold makes it Open again.

Everything below was actually executed in this environment unless it says NOT VERIFIED. Sections after "v2.2.0 history" are the earlier rounds, kept unchanged.

## v2.3.0: EXECUTED and passed
| What | Result |
|---|---|
| `npm run test:unit` (node:test) | **85 tests: 84 pass, 0 fail, 1 skipped** (the skip is the same as before: `package-lock.json` does not exist until you run `npm install`). The original 60 are unmodified; 25 are new (`slotInfo.test.js`, `importedSlots.test.js`). |
| `node scripts/check.mjs` (static) | **194 PASS, 0 failed, 0 skipped**, incl. 7 new v2.3.0 guards (no browser confirm/prompt, no React 19-only API, availability only changes from explicit buttons, Save never sends availability, native dialogs, safe areas) |
| Browser harness `tests/sandbox-browser/run.mjs` (headless Chromium, **fake backend**) | **89 checks passed, 0 failed**: every v2.2.0 live-update check ported to the new UI (polling, one poller, no listener leaks, hidden tab, network failure never logs out, typing not overwritten), student flow (hold, validation, success, cancel, audio only after clicks, reduced motion), phone layout (bottom tabs, bottom sheet anchored to the bottom, touch sizes, confirm button on screen), imported-slot flow end to end, teacher layouts, Lock now, no uncaught page errors |
| Overflow | no horizontal overflow at 320, 375, 390, 428, 768, 1024, 1440 px for the student page and all five teacher sections; landscape 667x375 and 844x390 also checked |
| Visual review | screenshots rendered and looked at (not only asserted): student desktop (empty panel, day panel, booking form, success, list), student phone (calendar, sheet, booking form, success, rules), teacher Overview, Schedule + editor, Bookings + editor, Settings, Lockdown (open and locked), schedule empty state, connection-error banner, teacher phone Overview/Schedule/editor/Bookings/Lockdown, landscape, student lock screen. Defects found this way are listed below. |
| JSX syntax | every file under `src/` parses (TypeScript transpile) |

### The imported-appointment report: how it was reproduced
`tests/unit/importedSlots.test.js` rebuilds the 180 imported slots from `seed.sql`, models the server rules, and **pins the model to the real SQL text** (6 tests assert the exact `UPDATE`, `list_slots` filter, `hold_slot` checks and `admin_set_available` behavior). It then shows: (1) right now students see 0 open appointments from the imported sheet; (2) editing room, time, period or date of an imported slot is saved and keeps it closed; (3) a future edited slot still lists for students as *Unavailable*; (4) moving one to a past date saves but it vanishes from the student list; (5) opening a future slot makes it Open and bookable; (6) a *past* slot can be marked Open on the server yet is never visible and booking fails with `past`; (7) new slots appear Open and stay editable; (8) the old default range hid Sept 28-29; (9) the old UTC "today" was wrong after 8 pm New York time; (10) re-closing a paper slot without a reason turns "Taken on paper" into "Not available".
**This is a model, not PostgreSQL.** The browser harness uses a separate fake with the same rules. Neither proves the real database behaves identically; the SQL was read and quoted, not executed.

## Defects found by running things this round (all fixed, then rerun)
1. Status dots carried `aria-label`s that became part of the nav buttons' names ("Lockdown Student site is open"). Found by the harness. Dots are now decorative; state is announced elsewhere.
2. I had put `role=gridcell` on calendar buttons without a grid structure (invalid ARIA, hides the button role). Caught before the first run, fixed.
3. Lockdown overflowed on phones: date-time inputs have a wide intrinsic size and `1fr 1fr` cannot shrink. Found by the overflow checks; tracks are now shrinkable and single-column under 520 px.
4. Visual review: the selected calendar day lost its fill when hovered; the sticky schedule toolbar was see-through and used about a third of a laptop screen; on phones the schedule showed about 480 px of chrome before the first row; every card repeated "Period N" under a "Period N" heading; the sheet's close button crowded the "open" count; picking another day while holding a slot left the hold running under a different highlighted day (now released).
5. Test-authoring mistakes (not product bugs): one regression test moved a slot onto a time that clashed with another slot in the same room (the model correctly answered `conflict`), and two selectors were ambiguous. Fixed in the tests; no assertion was loosened to pass.

## NOT VERIFIED (be exact about these)
- **`npm install`, `npm audit`, `npm run build` and `scripts/check-bundle.mjs` were NOT run.** The npm registry is unreachable from this environment, so Vite never built the bundle, the production CSS/JS was not produced, and the audit and the bundle secret scan remain unverified. The *source* secret scan inside `check.mjs` did run and passed. Run `npm run verify` on your computer (or push to GitHub: the workflow runs check, unit tests, build and the bundle scan).
- **React 18 was NOT exercised.** Only React 19.2 exists offline, so the browser harness ran on React 19. `package.json` still requires `^18.3.1`; a static check rejects React 19-only APIs, and the code uses only hooks that exist in 18, but a real run on 18 is still owed (`npm install && npm run dev` will use 18).
- **No real Supabase test.** `supabase/tests/db_tests.sql`, the SQL functions and the Playwright e2e spec (`tests/e2e`) were not executed. The e2e selectors were updated for the new UI but not run.
- Only Chromium was used. Safari (iOS), Firefox and real phones were not tested, including the on-screen keyboard and the notch/home-indicator insets (the CSS uses `env(safe-area-inset-*)`, and a check confirms it is present, but it was not seen on a device).
- Sound was verified only as "no AudioContext before a click, none during polling, saved preference"; nobody listened to it.
- Screen readers were not run; accessibility rests on native elements, labels, `role=timer`, focus-visible styles, native dialogs and the automated checks above.

## Safe test against YOUR `conference-TEST` project (about 10 minutes, no SQL changes)
Use the TEST site only (the build with TEST keys in `.env`). Never do this on the live project. Turn "Lock while editing" OFF in Settings first, or students on TEST will be locked for 10 minutes after each change.
1. **Baseline (read-only SQL Editor query):** `select count(*) total, count(*) filter (where reason='Not available') not_available, count(*) filter (where reason like 'Taken on paper%') paper, count(*) filter (where available) open_now, count(*) filter (where start_at>now()) future from slots;` Expect total 181 (180 imported + your test slot). Write the numbers down.
2. **Visibility:** teacher Schedule shows "All 181" with the default "All dates", including Sept 28.
3. **Edit an imported slot (expected restriction, not a bug):** filter Paper, pick one that is still in the future (if none is left, first change its date to a future day and Save: that also tests moving). Change only the Room to `TESTZ`, Save. Expected: message says students will see it as Unavailable; it still says "Taken on paper"; in a private browser window on the student site that day shows "closed" and the slot reads Unavailable with room TESTZ and **no Reserve button**.
4. **Intentional opening:** select it, "Open for booking…", read the warning, confirm. Within about 15 seconds the private window shows **Reserve**. Do not book it (if you do, cancel it in Bookings).
5. **Restore:** "Mark unavailable", choose **Taken on paper sign-up sheet**, then set the room back.
6. **Past slot:** pick any slot with a Past tag. "Open for booking…" must be disabled with the explanation.
7. **New slot:** Add & tools, a future date, room `TESTNEW`. It appears Open to students; edit its room (still Open); then delete it.
8. **Re-run the step 1 query.** Expect the same totals as before. If you re-closed in step 5 without choosing the paper reason, `paper` is one lower and `not_available` one higher: that is how `admin_set_available` works, and why the editor asks for the reason.
Report anything that differs from the "Expected" lines; that would be a real bug.

## v2.2.0 history
Environment: Linux sandbox, Node v22.22.2, Python 3 with pdfplumber, **no network, no PostgreSQL, no npm install possible**.
Labels: **EXECUTED** = code ran and passed. **STATIC** = a script ran and inspected source text (it did not run the code under test). **NOT RUN** = could not run here.

## EXECUTED and passed
| Command | Result |
|---|---|
| `node --test tests/unit/lib.test.js tests/unit/seed.test.js` | 20 passed, 0 failed (11 helper tests: time zones/DST, calendar grid, 60 s countdown, 24 h boundary; 9 seed tests) |
| Seed vs the PDFs: grid re-read from the 3 PDFs with pdfplumber (`tests/fixtures/pdf_grid.json`, codes only) and compared with `seed.sql` by the unit test | 60/60 rows equal after the fix. Totals asserted: 180 slots = 70 not-available + 109 paper-taken + 1 open; from 10/13: 48 = 21 + 27 + 0 |

## STATIC (script executed; SQL and UI were NOT executed)
`node scripts/check.mjs`: **144 passed, 0 failed, 0 skipped**: RLS enabled on 6/6 tables; no grants to anon, no policies; `require_admin()` present in 19/19 teacher functions; 13 frontend RPC names exist and none is an internal helper; 32 frontend calls match SQL parameter names exactly; 31 SQL function bodies have balanced if/end if, begin/case/end and parentheses; no keys/JWTs/.env; seed has no names; JSX syntax of 5 source files (via TypeScript's transpiler, esbuild unavailable here).
Negative tests (copies with deliberate damage): checker correctly FAILED on bad JSX, a missing `require_admin()`, an extra frontend parameter, and an unbalanced `if`.
These are **not** proof the SQL works. PostgreSQL has never parsed these files.

## NOT RUN
| Item | Why |
|---|---|
| Any SQL (schema, seed, functions) | no PostgreSQL. Highest remaining risk |
| `supabase/tests/seed_check.sql` (7 checks) and `supabase/tests/db_tests.sql` (~94 assertions, FIRST RUN BY YOU FAILED at 'admin edits booking', see below: RLS, holds, expiry, lock, edit lock, cancel rule, copy/publish, swap/move/edit, range reopen) | need a Supabase test project |
| Real concurrent requests (two sessions at once) | no DB; design uses `select ... for update` + unique constraints; no two-session test written |
| `npm install`, `npm run build`, `npm run verify`, `npm audit` | no network |
| Playwright e2e (3 tests), accessibility scan, phone layout in a real browser | no deps/Supabase; axe test not written |
| Deployment and hosted smoke test; real 60-second expiry (DB test backdates `expires_at`) | need your accounts / Mac |

## Defects found by running things this round (all fixed, then rerun)
1. Seed: Wed 9/30 P9 slot 3 was blank on the sheet but seeded as taken (found by re-reading the PDF tables).
2. A comment I had added to the seed named three students (found by the new privacy test; removed before packaging).
3. My own check script mis-parsed a conditional call (false alarm → parser rewritten); two sanity thresholds in a test were wrong guesses (corrected to values derived from the file).
Earlier rounds: `node --test <dir>` broke on Node 22; ASI bug in check.mjs.
Executions: each EXECUTED/STATIC command was run in the working folder and again in a freshly extracted copy of the ZIP (2 runs, not 3).

## Round 3: your real failure `FAILED: admin edits booking` (v2.1 db_tests.sql line 138)
**Result of your run (reported by you):** 1 failure, every assertion before it passed. **Cause (by reasoning, not by execution here: no PostgreSQL available):** a test bug, not a function bug. The assertion was `as_user(...admin_edit_booking...)='' AND (select name from bookings ...)='Renamed'` in ONE expression. PostgreSQL does not let a query see rows changed by a volatile function called inside that same query, so the `select` read the OLD name and the comparison failed even if the update worked. Evidence: `admin_edit_booking` is 5 plain statements with nothing that could skip the update; the booking existed (the prior assertion proved it was at that slot); the other 4 mixed assertions passed because they read through `is_locked()`, a volatile function that takes its own fresh snapshot; line 138 was the only one reading a table directly. Your `count(*) where name='Renamed'` = 0 after the rollback is expected whichever way it went, so it is not evidence either way.
**What I changed:** (1) the 5 mixed assertions are split so the call's result is stored first and the row is read in a separate statement; (2) every failure now prints what the last backend call returned (`FAILED: <name> (last backend call returned: [...])`), so if the function itself were failing you would see its exact error; (3) new `check.mjs` lint: flags any assertion that mixes a call with a read of its result. It flags exactly 5 lines in the v2.1 file and 0 in the fixed file (EXECUTED); (4) optional `supabase/tests/diag_edit_booking.sql` that shows the call result, the row afterwards, and reproduces the failing pattern in 3 NOTICE lines.
**Still unproven until you run it:** that the corrected test passes. If it fails again it will now name the exact error.

## Round 4: "Success. No rows returned" (db_tests.sql from v2.1.1)
Inspected the exact v2.1.1 file: (1) YES, `pg_temp.ok()` raises `FAILED: ...` for any false/null assertion, and the only `exception when others` handlers wrap the statement under test inside `as_user`/`anon`, never `ok()`; (2) it only did `RAISE NOTICE 'ALL DB TESTS PASSED'`, a notice, not a result row; (3) YES it ended with `ROLLBACK;`. So a clean "Success" means the DO block ran to the end with no exception (your earlier run showed the editor DOES display exceptions), but the file gave no positive on-screen confirmation: the editor shows only the last statement (ROLLBACK, no rows) and not notices. I therefore cannot claim from that output alone that it passed; it is strongly consistent with a pass, not proof.
Fix in v2.1.2: a temp sequence counts passed assertions (sequences survive ROLLBACK) and the script now ends with a SELECT row showing result / assertions_passed / expected (94) / leftover rows (must be 0). New static checks (EXECUTED) verify the file raises on failure, ends with ROLLBACK + result SELECT, and that 94 equals the count derived from the file (and is quoted in SETUP.md); verified to catch a wrong count and a missing ending.
Still NOT RUN here: the SQL itself. The v2.1.2 result row has not been seen by anyone yet.

## Round 5: `ERROR 42P01: relation "pg_temp.test_pass_counter" does not exist` (db_tests.sql v2.1.2)
**Cause (confirmed from the v2.1.2 file plus PostgreSQL's documented rule):** the file created the temp sequence as its first statements, then `begin; ... rollback;`. PostgreSQL runs all statements of one submitted script as one transaction, and an explicit `BEGIN` retroactively pulls the earlier statements into the new transaction block (PostgreSQL protocol docs, "Multiple Statements in a Simple Query"). So the later `ROLLBACK` also undid the CREATE of the sequence. My v2.1.2 reasoning "sequence values survive rollback" was true but I wrongly assumed the sequence's creation was outside the transaction. That was my error.
**Does the Supabase SQL Editor wrap the script in a transaction?** I could not find Supabase documentation that says either way (web search returned nothing authoritative). Your error is consistent with PostgreSQL's multi-statement rule alone; it is also what an editor-added BEGIN would do. v2.1.3 does not depend on the answer: the script has no BEGIN/COMMIT/ROLLBACK at all.
**v2.1.3 mechanism:** all test data is created inside the inner BEGIN...EXCEPTION block of `pg_temp.run_db_tests()`, which is a savepoint; the function ends that block with a deliberate exception (SQLSTATE `U0001`) that only that handler catches, and PostgreSQL undoes everything inside the block at that moment, inside the function. A temp sequence created before the function (top level, never inside the rolled-back region) counts passed assertions; `nextval` is never undone by a savepoint rollback. After the block the function reads the count, checks leftover rows and that `settings` equals its pre-test snapshot, and returns one row. The last statement of the file is `select * from pg_temp.run_db_tests();`, which the editor displays as a grid. A failed assertion raises `FAILED: ...`, which is not caught, so the script stops with a red error and the savepoint rollback still undoes the data. Added a guard that refuses to run if bookings/holds/draft slots already exist (several assertions count whole tables).
**EXECUTED:** 20 unit tests pass. **STATIC (script ran, SQL did not):** `check.mjs` 134 passed, 0 failed. It now analyses the structure of `db_tests.sql`: no transaction-control statements anywhere; last statement is the result SELECT with nothing after it; counter created at top level before the function; exactly one outer and one inner BEGIN; ordering inner BEGIN < sentinel raise < handler < END; only the U0001 exception is caught; every assertion call and every INSERT/UPDATE/DELETE lies inside the rolled-back region; counter and cleanup checks read after it; the guard precedes the region; the number 94 equals the count derived from the file and from SETUP.md; "ALL DB TESTS PASSED" only reachable when count, leftovers and settings checks hold. 9 deliberate mutations (BEGIN/ROLLBACK reintroduced, stray statement after the SELECT, sentinel moved early, catch-all handler, INSERT outside the region, counter read too early, wrong count, missing cleanup gate, counter incremented before the check) were each caught, and removing the guard was caught.
**Nothing was removed or weakened:** the 84 assertion call sites have identical labels in v2.1.2 and v2.1.3, and the entire old test body appears byte-for-byte inside the new function (only the setup inserts moved into the rolled-back region and the old notice line became the sentinel).
**NOT RUN, still:** every SQL file, including this one. I have not seen `run_db_tests()` execute; the v2.1.3 result row has never been produced by anyone. Possible failure modes I can't rule out without PostgreSQL: a PL/pgSQL compile error in the new function (it would show at CREATE time as a red error), or an assertion failing for a real reason.

## Round 6: stale teacher dashboard (v2.1.4)
**Root cause (from reading the code):** there is no Supabase Realtime anywhere. The student calendar is not "live": `App.jsx` re-fetches every 15 s with `setInterval`. The teacher panel (`Admin.jsx`, `load()`) fetched only on mount, when the date range changed, and after the teacher's own button clicks; nothing re-fetched it when a student acted, so Bookings and Schedule stayed stale until a manual refresh. Realtime `postgres_changes` could not have delivered these rows anyway: `001_schema.sql` revokes all table access and defines no RLS policies (and no realtime publication), so it was not added; polling through the existing RPC functions keeps database security unchanged.
**Secondary defects found and fixed:** any failed fetch set `ok=false` and sent the teacher to the sign-in page; overlapping/out-of-order responses could overwrite newer data; every tab re-fetched all 5 endpoints; the settings form was re-synced from the server object on every load, which would have overwritten text being typed once polling existed; `App` kept polling student data behind the teacher page (found by the browser run: 6 listeners instead of 3).
**EXECUTED (real results):**
| Command | Result |
|---|---|
| `node --test tests/unit/lib.test.js tests/unit/seed.test.js tests/unit/poll.test.js tests/unit/adminData.test.js` | 35 passed, 0 failed (15 new: poller fires/pauses when hidden/refreshes on focus and online/never overlaps/recovers from a hung request/survives errors/stop() removes every timer and listener, 50 start-stop cycles leave none; stale-response guard; each tab's data source is in the refresh; fake-backend scenario of your steps 3 to 8; network errors are not auth errors; settings form key) |
| Mutation: break the in-flight guard, break listener cleanup, drop bookings from the Bookings tab | the matching tests FAILED each time |
| `tests/sandbox-browser/run.mjs`: real Chromium, the project's real `src/App.jsx` and `src/Admin.jsx` compiled with TypeScript, FAKE in-page backend (not Supabase), Playwright clock | fixed sources: 26 passed, 0 failed. Original v2.1.3 sources, same harness: FAILED A1 (booking never appears on Bookings), A3, A4 and then stalled; i.e. the harness reproduces your bug |
| Harness with the "log out on transient error" mutation | A8 FAILED (caught by browser harness and by static check) |
Harness covers: booking/cancellation/re-booking/new slot/deleted slot reach Bookings and Schedule within one 5 s poll with no reload; teacher's own Cancel updates immediately; 24 tab switches leave exactly one poller and 3 listeners; nothing is requested while the page is hidden and it refreshes on becoming visible; a network failure keeps the dashboard, shows a warning and recovers; typing in Settings is not overwritten; leaving the teacher page stops its polling; the student calendar reflects a booking/cancellation within one 15 s poll; no uncaught page errors.
**STATIC:** `check.mjs` 144 passed, 0 failed (new: both pages poll and return the cleanup; student polling is off behind the teacher page; only auth errors reach sign-in; refetch after every action; stale-response guard in 3 places; form keyed by field values; no Realtime channel without cleanup; no RLS policy or realtime publication added). 6 mutations of these checks were each detected.
**Caveats about the browser harness:** it uses a FAKE backend that I wrote, React 19 from the sandbox (the project pins React 18.3.1), and a fake clock. It proves the React wiring and the polling logic; it does NOT prove the real Supabase functions, real network behaviour, or Supabase's own latency. SQL files are byte-identical to v2.1.3 (so `db_tests.sql` results are unaffected).
**NOT RUN:** `npm install`, `npm run build`, `npm run verify`, the bundle secret scan of `dist/` (no network, Vite not installable here); the real-Supabase manual test below; Playwright `test:e2e` against real Supabase.
## Manual test against YOUR conference-TEST project (about 5 minutes)
1. `npm run dev`; teacher browser: open the printed address plus `#admin`, sign in, open **Bookings**. Leave it open, do not refresh.
2. Teacher browser, **Schedule**: add one slot for a future date; then **Make available** if needed. Student: a private window on the same address, reserve it, confirm.
3. Within about 5 seconds the teacher's Bookings list must show the booking, and the text "Updated HH:MM:SS" must tick. Pass/fail.
4. Teacher: **Cancel** the booking. It disappears at once. The student window shows the slot open again within about 15 seconds. Pass/fail.
5. Book again as the student; Bookings shows it within about 5 seconds without refreshing. Pass/fail.
6. Open a second teacher window, delete or edit the slot there; the first window shows the change within about 5 seconds. Pass/fail.
7. Turn off Wi-Fi for 15 seconds: the teacher page stays on the dashboard with "Connection problem..."; turn it on: the message disappears by itself.

## Round 7: `npm audit` reported 1 moderate + 1 high (Vite / esbuild) (v2.1.5)
**What the advisories are (researched from public advisory databases on 13 Oct 2026; I could NOT run `npm audit` here, so I do not know which exact advisories YOUR audit listed):**
| Package | Advisory | Affected | Fixed in |
|---|---|---|---|
| vite | GHSA-fx2h-pf6j-xcff (CVE-2026-53571), HIGH: `server.fs.deny` bypass on Windows alternate paths | up to 6.4.2, 7.0.0 to 7.3.4, 8.0.0 to 8.0.15 (the 5.x line has no security release) | 6.4.3, 7.3.5, 8.0.16 |
| vite | GHSA-p9ff-h696-f583 (CVE-2026-39363) HIGH WebSocket file read; GHSA-4w7w-66w2-5vf9 (CVE-2026-39365) path traversal in optimized-deps `.map` | 6.0.0 to 6.4.1, 7.0.0 to 7.3.1, 8.0.0 to 8.0.4 | 6.4.2, 7.3.2, 8.0.5 |
| esbuild | GHSA-67mh-4wv8-2f99 MODERATE: dev server answers requests from any website | 0.24.2 and older | 0.25.0 |
| esbuild | GHSA-g7r4-m6w7-qqqr LOW: dev-server path traversal on Windows | 0.27.3 to 0.28.0 | 0.28.1 |
All are **development-server** problems (they matter when you run `npm run dev`, especially with `--host` or on Windows). None is shipped inside the built website. v2.1.4's tree matched this: `vite ^5.4.0` (installs 5.4.21, no fix exists on 5.x) and `esbuild ^0.21.5` (my own devDependency, plus the copy Vite 5 bundles).
**Chain (from package.json, since no lockfile is in the ZIP):** root `vite` (direct) bundles its own `esbuild`; root `esbuild` (direct, used only by `scripts/check.mjs`); `@vitejs/plugin-react` has Vite as a peer dependency.
**Change:** `vite ^5.4.0` to `^7.3.6`; `@vitejs/plugin-react ^4.3.1` to `^4.7.0` (first 4.x declaring Vite 7 support); `esbuild ^0.21.5` to `^0.25.12` (patched, accepted by Vite 7, and the caret cannot drift into 0.27.3 to 0.28.0 where the low advisory sits; with one copy at the top, npm reuses it for Vite instead of adding a second); added `engines.node` `^20.19.0 || >=22.12.0` (Vite 7's requirement; Node 24 satisfies it); workflow `node-version` 20 to 22 (Node 20 is end-of-life and Vite 7 needs 20.19+). React stays 18.3.1. Why Vite 7 and not 6.4.3 or 8: 7.x is patched (7.3.5+), works with plugin-react 4.x unchanged and keeps esbuild-based builds; 8 swaps the bundler (Rolldown) and needs plugin-react 6, which is more change than needed; 6.4.3 is also patched but is the older line. `vite.config.js`, `index.html`, every `src/` file, SQL and seed are byte-identical to v2.1.4 (verified with cmp).
**EXECUTED (real results):**
| Command | Result |
|---|---|
| `node --test` on the 5 unit files | 42 tests: 41 passed, 0 failed, **1 skipped** (35 earlier tests + 7 new dependency-guard tests; the skipped one checks `package-lock.json`, which does not exist in this folder) |
| Dependency guard on synthetic lockfiles (NOT your real lockfile): a v2.1.4-style tree (vite 5.4.21 / esbuild 0.21.5) | FAILED as it should; a patched tree (7.3.6 / 0.25.12) passed; changing the manifest back to `vite ^5.4.0` made the manifest test fail |
| `node scripts/check.mjs` | 144 passed, 0 failed (STATIC) |
| `tests/sandbox-browser/run.mjs` (React 19 + fake backend, does not use your Vite) | 26 passed, 0 failed |
**NOT RUN (cannot be run here, no network):** `npm install`, **`npm audit`**, `npm run build` on Vite 7, `node scripts/check-bundle.mjs`, `npm ls`, `npm run test:e2e`. So I did **not** confirm that Vite 7.3.6 builds this project, that `npm audit` is clean, or that the resolved tree contains no other advisories (new ones appear over time; I also saw unverified mentions of two further Vite advisories, GHSA-859j-r86m-m3mj and GHSA-pc3c-v4xw-v6vq, that I could not confirm or rule out; `npm audit` on your machine will decide). No `package-lock.json` is included: a lockfile needs registry hashes I cannot obtain offline, and a hand-written one would be unsafe. `npm install` on your Mac rewrites yours consistently from the new package.json.
## Verify on your Mac (your Node 24)
```
cd conference-scheduler          # the v2.1.5 folder; keep your .env
cp ../OLD_FOLDER/package-lock.json .   # optional: reuse your old lock so unrelated packages stay pinned
npm install                      # NOT npm ci: this updates package-lock.json to match the new package.json
npm ls vite esbuild @vitejs/plugin-react    # expect vite 7.3.6+ , ONE esbuild 0.25.12+ (marked "deduped"), plugin-react 4.7+
npm audit                        # your result decides whether anything remains
npm run verify                   # checks + 42 unit tests (the lock test now runs, not skipped) + build + bundle scan
npm run dev                      # then repeat the 5-minute manual test in this file
```
If `npm install` stops with an ERESOLVE/peer error, or `npm audit` still lists vite/esbuild, send me the full output; do NOT run `npm audit fix --force`.

## Round 8: `21000 UPDATE requires a WHERE clause` on "Lock now" (v2.1.6)
**Root cause:** `admin_set_lockdown`, `admin_update_settings` and `admin_end_edit` each ran `update settings set ...` with no WHERE. Supabase loads the `pg-safeupdate` extension for its API roles, which rejects any UPDATE or DELETE without a WHERE, including inside functions called through the API. **Why my earlier database tests did not catch it:** the SQL Editor connects as `postgres`, where that guard is not loaded, so the 94 assertions (which called `admin_set_lockdown` and `admin_end_edit`; `admin_update_settings` had no test at all) passed there. That gap is mine.
**Audit of every UPDATE/DELETE in all SQL files:** 24 statements in `001_schema.sql`: 3 without WHERE (the three above), 21 with WHERE (this includes `touch_edit_lock`, whose WHERE is `auto_lock_on_edit`). All DELETEs have a WHERE. No intentional bulk operation exists, so none was changed (an intentional one would be written `where true`). The test files' own setup had 13 unqualified `update settings`/`update bookings` statements; they now have `where id=1` / `where slot_id=...` so the suite is also safe through the API roles.
**Fix:** `where id=1` (the `settings` table holds exactly one row, enforced by `check (id=1)`) in the three functions, in `001_schema.sql` and in the new `supabase/migrations/002_fix_unqualified_updates.sql`. Signatures, `security definer`, `search_path`, `require_admin()` checks and logic are unchanged (unit-tested by comparing against the v2.1.5 functions).
**New regression protection:** (1) `scripts/sqllint.mjs` finds any UPDATE/DELETE without WHERE (ignores comments, strings, `FOR UPDATE`, `ON DELETE`), runs in `npm run check` on every SQL file; a fixture of the three v2.1.5 functions proves it detects the original bug (3 findings), while v2.1.6 has 0. (2) `tests/unit/sqllint.test.js` (10 tests): linter edge cases, fixture, all SQL files clean, 002 identical to 001 for the three functions, 002 contains no table/data statements and no transaction control, grants limited to those 3. (3) `supabase/tests/verify_functions.sql`, a read-only catalog query for any database (SQL: NOT RUN). (4) 14 new assertions in `db_tests.sql` (now 108): the catalog check on the deployed functions, effects of `admin_update_settings` (save, blank text, bad time zone, student forbidden), Lock now / Unlock now / `admin_end_edit` on the settings row.
**EXECUTED (real results, Node 22 sandbox):**
| Check | Result |
|---|---|
| `node --test` on 6 unit files | 52 tests: 51 passed, 0 failed, 1 skipped (the lockfile check; no lockfile in this folder) |
| `node scripts/check.mjs` (STATIC: reads source text) | 150 passed, 0 failed |
| Linter on the v2.1.5 migration as shipped | 3 findings (lines 275, 282, 286); on v2.1.6: 0 |
| 7 deliberate breakages (WHERE removed in 001 and in 002, 002 drifting from 001, a destructive statement in 002, admin check removed in 002, unqualified UPDATE in the test file, a deleted assertion) | each detected by static checks and/or unit tests |
| `tests/sandbox-browser/run.mjs` (React 19, fake backend; app code untouched) | 26 passed, 0 failed |
**NOT RUN, cannot be run here:** every SQL file in PostgreSQL: **`002_fix_unqualified_updates.sql`, `verify_functions.sql`, `db_tests.sql` (108 assertions) and the new catalog assertion have never executed**; the real API-role behaviour of the three functions (only your own manual test of `admin_set_lockdown` is evidence); `npm install`, `npm audit`, `npm run build`, the bundle secret scan (no network here; you reported 0 vulnerabilities and a working Vite 7 build on v2.1.5, and no dependency or app file changed in v2.1.6, but I did not re-run them). I did not write a probe that loads `pg-safeupdate` itself, because I cannot verify that Supabase allows `LOAD` there.
**Exact things to run on your Mac:** `npm install` (not needed unless package.json changed; it did not change apart from the version and a test file) then `npm run verify` (static checks, 51 unit tests + 1 now-running lockfile test, build, bundle scan), then the 6-step TEST-project procedure in SETUP.md.

## Round 9: AURORA redesign, first pass (v2.2.0)
**EXECUTED (real results, Node 22 sandbox):**
| Check | Result |
|---|---|
| `node --test` on 7 unit files | 60 tests: 59 passed, 0 failed, 1 skipped (the lockfile check; no lockfile in this folder). 52 baseline + 8 new sound tests |
| `node scripts/check.mjs` (STATIC) | 169 passed, 0 failed (156 earlier + 13 design/sound checks) |
| `tests/sandbox-browser/run.mjs`: real Chromium, the project's real `src/*.jsx` and the real `style.css`, FAKE in-page backend (not Supabase), fake clock, React 19 | **51 passed, 0 failed** (26 earlier polling/teacher/student tests + 25 new) |
| 5 deliberate breakages of the new guards (reduced-motion rule removed, remote asset in CSS, sound imported into the teacher page, audio context no longer lazy, sound defaulting ON) | each detected |
New browser tests: hero and toggle present; sound OFF by default and no AudioContext created; two 15 s polling cycles create no audio; toggle on/off announced and saved locally; no horizontal overflow at 320, 375, 768, 1024 and 1440 px (student page and teacher Schedule); day panel opens as a modal dialog; hold countdown is a labelled timer, not a live region; success card appears only after the backend confirms and shows date, period, time, room and the 24 h rule; audio only after the user's click; reduced-motion disables the ambient and entrance animations; desktop teacher nav is a sidebar and becomes a compact bar on a phone.
**Visual review:** I looked at screenshots (Chromium, fake data) of the student page with the day dialog open (1280 px), the student page at 390 px, and the teacher Overview and Schedule (1280 px). Found and fixed: sound button wrapping under the hero, an empty status bar, calendar too far down on phones (Rules now collapsible), Sign out looking like a section link, unlabeled empty activity card, stacked date filters. Not visually reviewed: the Bookings and Settings tabs, the lockdown screen, the countdown-low state, the list view, error states, the 768 px layout (overflow-checked only).
**NOT RUN (cannot be run here, no network):** `npm install`, **`npm audit`**, **`npm run build`**, the bundle secret scan, `npm run verify`, Playwright against your real Supabase TEST project, any SQL. The redesign changed no dependency, config or SQL, but the build and audit results for v2.2.0 are unverified. The browser tests use a fake backend and React 19; they do not prove behaviour against real Supabase or React 18. Contrast ratios were estimated from the palette, not measured with a tool. Audio output was not heard (headless browser); only that sounds are or are not requested.
**Verify on your Mac:** `npm install` then `npm audit` then `npm run verify` (checks, 59 unit tests plus the lockfile test, build, bundle scan), then `npm run dev` and run the 5-minute manual test above, plus: turn sound on and book (chime at confirmation only), reload (toggle remembered), tab through the page (focus ring visible), and try your OS "reduce motion" setting.


---
# v2.4.0 test report (what ran, what did not)
**Ran in the author's sandbox (no network):**
- `node scripts/check.mjs`: 0 failed (updated for 003, SELECT-only realtime policies, realtime wiring).
- Unit tests: 155 total, 154 passed, 1 skipped (lockfile test: no `package-lock.json` yet). The original 85 are unchanged; 70 added (realtime controller with fake client and timers, bulk logic on the real 180-slot fixture, roster privacy, activity formatting for every event type and legacy strings, version consistency, static analysis of migration 003).
- Browser harness (`npm run test:browser`; real Chromium, React 19, **fake backend and fake realtime channel, not Supabase**): 136 passed, 0 failed, including live signal updates, coalescing, reconnect, bulk toolbar and dialog, roster switch, About/What's New, and no horizontal scroll at 320/375/390/428/768/1024/1440.

**NOT run (could not, here):**
- Migration 003 and every SQL file: no PostgreSQL. SQL is only statically linted. `db_tests_v240.sql` has never been executed and may need fixes.
- `npm install`, `npm audit`, `vite build`, the bundle scan and the production-version check (`dist/` absent). The browser harness uses React 19, the app targets React 18.
- Real Supabase Realtime and multi-browser tests; real concurrency (two sessions booking one slot).
- Real iOS/Android/Chromebook devices; automated WCAG contrast measurement; screen readers.

---
# v2.4.2 test report (what ran, what did not)
**EXECUTED in the author's sandbox (no PostgreSQL, no network):**
- `node scripts/check.mjs`: 0 failed, 0 skipped.
- Unit tests (`node --test`, `npm run test:unit`): 183 tests, 182 pass, 0 fail, 1 skipped (the package-lock.json check, skipped because the lock file is created by `npm install`, as in v2.4.1). v2.4.1 had 175 tests. The XML tests ran because `xmllint` is installed here; they skip themselves where it is not.
- libxml2 (`xmllint`) checks of the XPath used by the verify script, against XML written BY HAND in the shapes the PostgreSQL manual documents for `query_to_xml` (`<table><row><c>`, bare `<row>`, zero rows, NULL column omitted, two rows, empty). Results: the v2.4.1 path `/row/c/text()` matches only the bare-row shape and nothing in the `<table>` shape; the v2.4.2 path `/table/row/c/text() | /row/c/text()` returns the value from both and an empty node set for zero rows or NULL; a two-row forest and an empty value are rejected as "not a single document". These are libxml2 results (the engine behind PostgreSQL `xpath()`), **not PostgreSQL results**.
- The new static tests were also run against the v2.4.1 verify script and FAIL on it (they detect the old design).
**Transaction assumptions of the verify script (v2.4.2):** it is ONE statement, so it makes no assumption about how an editor splits or wraps a script, and PostgreSQL evaluates it against one snapshot. Read-only is guaranteed by its text (no write or transaction-control word, one semicolon, tests enforce it), not by PostgreSQL. `SET TRANSACTION READ ONLY` was removed because it is ignored with a warning (25P01) outside a transaction block. The row "transaction mode of this run" reports what a run really had. The optional `psql` BEGIN READ ONLY recipe in the file header was NOT executed.
**NOT RUN (could not be):** migration 003 (including the new guard), `verify_v240_READONLY.sql` (including check 64 and the XML probes), `db_tests_v240.sql`, `db_tests.sql`, `rollback_003_REVIEW_FIRST.sql`: **no PostgreSQL was available, so no SQL statement from this project has been executed.** Also not run: `npm install`, `npm run build`, `check-bundle`, the browser harness (not re-run, no frontend change besides the version and the What's New text), Playwright, real Realtime, real devices.
**What to expect on first execution:** a blind SQL rewrite can still contain mistakes. The most likely places are the new `raw`/`probe` CTEs and check 64 of the verify script. If a probe misreads the XML the report now says COULD NOT READ and prints the raw XML, which is what a reviewer needs to fix it.

---
# v2.4.1 test report (what ran, what did not)
**EXECUTED in the author's sandbox (no PostgreSQL, no network):**
- `node scripts/check.mjs`: 0 failed, 0 skipped.
- Unit tests (`node --test`): see the final count in the delivery message; includes 12 new tests in `tests/unit/sqlscripts240.test.js` and 11 added or strengthened tests in `tests/unit/migration003.test.js`. Version tests expect 2.4.1.
- Browser harness (`node tests/sandbox-browser/run.mjs`): 136 passed, 0 failed. FAKE backend and fake realtime channel, React 19 from the sandbox. It proves the front end still works; it says nothing about the database.
**What the new unit tests prove (static only):** (v2.4.1 design, superseded in v2.4.2: the verify script had a READ ONLY statement and one SELECT) the verify script contains no write or DDL keyword, names no 003-only column outside string literals, and expects exactly the functions, triggers, policies and columns the migrations create; `db_tests_v240.sql` has the same rollback mechanism checks as `db_tests.sql`, refuses a non-empty database, every inline teacher call is preceded by teacher claims, no assertion mixes a call and a read, and its assertion count (112) matches the file. **They cannot prove the SQL parses or passes.**
**NOT RUN (could not be):**
- **Migration 003 (corrected), `verify_v240_READONLY.sql`, `db_tests_v240.sql`, `db_tests.sql`, `rollback_003_REVIEW_FIRST.sql`: no PostgreSQL was available.** No SQL statement from this project has been executed in this review. I hand-checked syntax and name resolution, but a blind SQL rewrite of this size can still contain mistakes; expect to fix small things on first execution.
- `npm install`, `npm audit`, `npm run build`, `scripts/check-bundle.mjs`, `npm run verify` as a whole (needs the npm registry; `vite` and `@supabase/supabase-js` are not installed here). The check and unit-test steps of `verify` were run separately and pass.
- Playwright e2e against Supabase, real Realtime, two-browser and concurrency tests, real devices.
**How the SQL files are meant to be used (after your independent review):**
1. conference-TEST: paste the whole `verify_v240_READONLY.sql` and Run once (expect VERDICT "BEFORE 003 ... NOT installed"), later after the migration (expect "AFTER 003 ... all N checks passed").
2. A SECOND, brand-new empty Supabase project (throw-away): 001, 002, 003, then `db_tests_v240.sql` (expect ALL V2.4.1 DB TESTS PASSED, 112 of 112, leftover 0, settings_restored true, data_unchanged true). `db_tests.sql` is run on a freshly seeded throw-away project too. **Neither test file is meant for conference-TEST.**
**Two-browser Realtime checks** are listed in REALTIME.md.


# v2.4.3 test report
See TEST_REPORT.md (what ran), KNOWN_ISSUES.md (open items) and MANUAL_TEST_CHECKLIST.md (your TEST project steps). New: `npm run test:browser:bulk` (sandbox only; needs the global React 19 / Playwright / TypeScript the build environment has).
