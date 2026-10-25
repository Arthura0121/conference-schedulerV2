# English Conferences — v4.1.1

Current update: active foreground viewer counting and responsive layout refinements. See `VISITOR_COUNT.md` for behavior and verification. No database migration is needed.


**Mac quick start (existing checkout):**
```bash
cd "$HOME/Downloads/conference-scheduler-v2.4.3"
git fetch origin
git switch main
git pull --ff-only origin main
npm ci
npm run verify
npm run dev
```

The folder name is historical; the application's version is read from `package.json`, not the folder name. The project's `.env` must already contain your own TEST Supabase settings. Test the student and teacher booking flows against your test database before production use. CI runs static checks, unit tests, the production build, and mocked Chromium browser tests across all four themes. See `CHANGELOG.md` and `KNOWN_ISSUES.md` for scope and limitations.

---

## Historical setup and migration notes (older versions)


> **v2.3.0 note:** this release is a frontend redesign plus a teacher-screen fix for imported appointments. The database, SQL, seed and security model are unchanged from v2.1.6, so **no new migration is needed**. See CHANGELOG.md, DESIGN.md and TESTING.md (including what could not be verified and the safe `conference-TEST` procedure).


> ## READ FIRST: your old Supabase project
> You already ran the **original (v1) schema and seed** in a Supabase project. **Do NOT paste v2 into that project.** v2 uses the same table names with different columns and functions, so it is not an upgrade and must go into a **brand-new project**. As a safety net, `001_schema.sql` starts with a guard that is written to stop with a `STOP:` message if those tables already exist (the guard itself is untested, so don't rely on it).
> Never run anything in a folder called `dev_only` except the read-only inspect script described in Part 0.

**v2.4.3:** frontend-only release (phone toolbar fix, safer bulk confirmation). **No SQL to run; do NOT re-run migration 003.** See CHANGELOG.md, TEST_REPORT.md, KNOWN_ISSUES.md and MANUAL_TEST_CHECKLIST.md.

## Mac quick start for v2.4.3 (copy one line at a time into Terminal)
1. Unzip, then: `cd ~/Downloads/conference-scheduler-v2.4.3` (adjust if you unzipped elsewhere)
2. `npm install`
3. `npm run verify`  (checks, unit tests, production build, bundle safety; it must end without errors)
4. `npm run dev`  then open the address it prints (usually http://localhost:5173)
Your `.env` file (TEST Supabase address and key) must already be in this folder; copy it from your v2.4.2 folder.


**v2.4.2:** the read-only verification script was corrected (XML extraction; it no longer relies on `SET TRANSACTION READ ONLY`) and migration 003 got one extra guard (see CHANGELOG.md and AUDIT.md). Migration 003, the verification script and the SQL tests have still **never been executed** against any database: do not apply migration 003 until it has been independently reviewed.

**Honest status:** the unit tests and static checks ran and passed (see TESTING.md). The SQL, the website build and the browser tests have **never been run**. The steps below are the order that finds problems fastest and risks nothing real.

## Applying v2.1.6 to your EXISTING conference-TEST project (migration 002)
**Why:** "Lock now" failed with `21000 UPDATE requires a WHERE clause`. Supabase's API rejects any UPDATE/DELETE without a WHERE, and three teacher functions (`admin_set_lockdown`, `admin_update_settings`, `admin_end_edit`) had one. v2.1.6 fixes them in `001_schema.sql` (for new projects) and in **`supabase/migrations/002_fix_unqualified_updates.sql`** (for databases that already exist).
**What 002 does and does not do:** it only replaces the definitions of those 3 functions (same names, arguments and security settings; they still require a teacher account) and re-states who may call them. It does NOT touch any table or row: bookings, slots, holds, settings values and users are not modified, deleted or reset. Your hand-made patch of `admin_set_lockdown` is replaced by the equivalent official version (`where id=1`). It has no BEGIN/COMMIT/ROLLBACK; it stops at the first error. Do **not** run `001_schema.sql` again on this project (its built-in guard would stop with `STOP:` anyway).
Do these in order, in the **conference-TEST** project only (SQL Editor, one paste each):
1. **Write down your data first.** Run: `select (select count(*) from bookings) as bookings, (select count(*) from slots) as slots, (select count(*) from holds) as holds, (select count(*) from admins) as admins;` and note the four numbers.
2. **Check the current state (read-only).** Paste `supabase/tests/verify_functions.sql` and Run. Expected now: `status = PROBLEM` rows for `admin_update_settings` and `admin_end_edit` (and none for `admin_set_lockdown`, because you patched it). If it lists any other function, stop and send me the grid.
3. **Apply the fix.** Paste the WHOLE of `supabase/migrations/002_fix_unqualified_updates.sql` and Run. A red `STOP:` error means nothing was changed (wrong database or a failed check); copy it to me. Success shows a grid of **3 rows**: `has_where_id_1 = true`, `runs_as_owner_security_definer = true`, `signed_in_users_can_call = true`, `anon_can_execute_should_be_false = false`, and `bookings_untouched_count` / `slots_untouched_count` equal to the numbers from step 1.
4. **Verify again (read-only).** Run `supabase/tests/verify_functions.sql` again. Expected: ONE row, `status = OK`. Run the step-1 query again: the four numbers must be identical.
5. **Click-test in the app (about 3 minutes):** teacher page, Settings: **Lock now** (expect "Done.", and the student page shows "We'll Be Back Soon!"); **Unlock now**; change the rules text and press **Save** (expect "Done." and the text kept after Refresh now); press **End editing lock** (expect "Done."). These are the three buttons that call the fixed functions.
6. `supabase/tests/db_tests.sql` (108 assertions, now including these three functions) **refuses to run on a project that already has bookings**, so it will refuse on this TEST project. To run it, use a fresh empty test project (Part 1), where 001 from v2.1.6 already contains the fix and 002 is not needed.
**Going live:** a NEW live project needs only `001_schema.sql` (v2.1.6) + seed + admin; do not run 002 there (harmless if you do). Never run these scripts on a live project that already has real bookings without asking me first: the read-only `verify_functions.sql` is always safe.

## Part 0: Look at the old project (optional, read-only, 2 minutes)
1. Open the OLD project → **SQL Editor → New query**, paste `supabase/dev_only/inspect_existing_project_READONLY.sql`, Run. It only reads.
2. It shows the tables there and `v1_bookings`, the number of bookings. If that is 0 (or only your own tests), the old project holds nothing you need. If it is more than 0, keep the project, save the result grid as CSV, and tell me before doing anything else.
Do not delete or reset the old project yet.

## Part 1: Make a separate TEST project (nothing real at risk)
1. supabase.com → **New project** → name it `conference-TEST`. (Free accounts only get a limited number of active projects; if the dashboard blocks you, pause the old one from its Settings page, not delete.)
2. **Authentication → Sign In / Providers → Anonymous Sign-Ins: ON.**
3. SQL Editor → paste all of `supabase/migrations/001_schema.sql` → Run. Expect "Success". If you see `STOP:` you are in the wrong project.
4. Paste `supabase/seed.sql` → Run. Then paste `supabase/tests/seed_check.sql` → Run. Every row must show `ok = true`.
5. **Authentication → Users → Add user** (your email, strong password, tick Auto Confirm). Put the email in `supabase/make_admin.sql` → Run → `admins_created = 1`.
6. Paste `supabase/tests/db_tests.sql` → Run. It takes a few seconds. **How to read the result (v2.1.3):**
   - **Passed:** a result grid with exactly ONE row: `test_result = ALL DB TESTS PASSED`, `assertions_passed = 108`, `assertions_expected = 108`, `leftover_test_rows = 0`, `settings_restored = true`. 108 assertions are in the file by my count. If `test_result` says `INCOMPLETE` or `PASSED BUT CLEANUP CHECK FAILED`, that is NOT a pass: send me the row.
   - **Failed:** a red error `FAILED: <name> (last backend call returned: [...])`. Copy it to me.
   - **Refused:** `REFUSING TO RUN: ...` means this project already has bookings/holds/draft slots; use a fresh TEST project.
   - Plain "Success. No rows returned" is not a valid outcome of this version. The file has no BEGIN/COMMIT/ROLLBACK: all test data is created inside one block that PostgreSQL undoes by itself (a savepoint), and the last statement is the result query because the editor shows only the last statement. Older versions (v2.1 to v2.1.2) ended with ROLLBACK and could not show a result; do not rely on their output.
   - `supabase/tests/diag_edit_booking.sql` is an optional 30-second check of `admin_edit_booking` only.
7. **Project Settings → API**: copy Project URL and the anon/publishable key (never `service_role`).

## Part 2: Run on your Mac against the TEST project
Install Node 22 or 24 (nodejs.org). Vite 7 needs Node 20.19+ or 22.12+. In Terminal, inside this folder:
```
cp .env.example .env      # open .env in TextEdit, paste the TEST URL and key
npm install
npm run verify            # static checks + unit tests + production build + bundle scan
npx playwright install chromium
npm run test:e2e
npm run dev               # then try it by hand (checklist below)
```
Paste me the **complete** output of the first four commands and the DB message from Part 1 step 6, and I will fix everything in one batch.
Hand-test checklist (10 minutes): (a) calendar shows 10/13–10/16 greyed (all taken or not available, as on your sheets); (b) `#admin` → sign in → Schedule → "Make available" on one slot; (c) in a second browser (private window) reserve it, confirm; (d) in the first browser see it under Bookings; (e) wait 60 s on a hold and confirm it is rejected; (f) Settings → Lock now → student page shows "We'll Be Back Soon!" → Unlock now.

## Part 3: Going live (what is required, and why a fresh project)
The test project now contains test accounts and test bookings. Cleanest and safest path: **create a third project `conference-LIVE`**, repeat Part 1 steps 2–5 only (schema, seed, admin; do not run the tests there), and point the website at it. Nothing needs to be copied, because your real sign-ups are on paper and are not in any database. Then:
1. Put the LIVE URL/key in the GitHub variables (Part 4), not in the repo.
2. In Schedule, release only the slots you want students to book (see "What the seed means" below).
3. Only after real students have booked: never re-run `001_schema.sql`. Every later database change must be a new numbered file (`002_...sql`) applied once, and tested first on the TEST project.
**Moving real bookings between projects is NOT supported by v2** (there is no import function; student sessions can't be carried over). If real bookings ever exist in a project you want to abandon, run the read-only export in `dev_only` for your records and ask me for an import function first.

## Part 4: Publish on GitHub Pages
1. Create a GitHub repo, upload this folder (`.env` is git-ignored; never upload it).
2. Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public values).
3. Settings → Pages → Source: **GitHub Actions**. Push to `main`. The workflow runs the checks and unit tests before building. Site: `https://USERNAME.github.io/REPO/`.

## What the seed means (answer to "is everything unavailable?")
I re-read the PDF tables cell by cell. Of 180 slots over the three weeks: **70** say "Not Available", **109** have a student name written in (stored as unavailable, reason "Taken on paper sign-up sheet", names NOT imported), and **1** is blank/open: Wed 9/30, Period 9, 3:05, which is already in the past. From 10/13 on: 21 not available, 27 taken, **0 open**. So yes, on the sheets as given nothing is bookable for 10/13–10/16, and the seed faithfully says so. To open a slot (for example, a student cancelled on paper), use Schedule → "Make available". To create bookable weeks, use Schedule → "Copy a week as a template": copying turns paper-taken slots into open ones and keeps Not-Available ones closed.
Open question for you: on the Thu 10/15 Period 3 sheet one cell holds two student names and another cell a third, so 3 students for 2 slots.

## Teacher tools: exactly what they do
- **Edit lock** (off by default, Settings checkbox): when on, changing, deleting, closing or reopening slots keeps students out for 10 minutes after each change. A yellow banner shows the time and a **Finish editing now** button ends it. If you close the browser it still ends by itself. Copying, publishing, moving, swapping, editing or cancelling bookings never lock students.
- **Close/Reopen range** only reopens slots that "Close range" closed; "Not available" and paper slots stay closed until released one by one.
- A booked slot can't be marked unavailable or deleted until you cancel or move the booking.
- **Lockdown:** "Lock now" (with an optional "Reopens at" time), or a scheduled start/end. Times use your computer's time zone.
- **Rules enforced by the server:** 60-second holds on the database clock, one booking per browser session, 24-hour student cancellation, lockdown, all teacher actions require your admin account.
**Limits:** students are anonymous per browser, so one person with two browsers can still book twice (Bookings flags duplicate names). A script making many anonymous sessions could hold slots 60 s each; Supabase captcha can be enabled if that happens. A student mid-booking when an edit lock starts sees "closed" and their hold lapses. Free projects pause after about a week of inactivity.

## Live updates (v2.1.4)
The teacher page refreshes itself every 5 seconds while it is open and visible (and when you return to the tab); students' pages every 15 seconds. Use the **Refresh now** button next to "Updated ..." if you want it immediately. If the connection drops you will see "Connection problem" and it retries by itself. There is no Supabase Realtime in this project on purpose (see AUDIT.md E2). The 5-minute manual test is in TESTING.md ("Manual test against YOUR conference-TEST project").

## Dependency updates (v2.1.5)
The build tools were upgraded to patched versions (Vite 7). After unzipping, run `npm install` (not `npm ci`) once so your `package-lock.json` is regenerated, then `npm audit` and `npm run verify`. Details and the exact expected `npm ls` output are in TESTING.md, Round 7.
