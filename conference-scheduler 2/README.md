# Setup guide (v2.1)

> ## READ FIRST: your old Supabase project
> You already ran the **original (v1) schema and seed** in a Supabase project. **Do NOT paste v2 into that project.** v2 uses the same table names with different columns and functions, so it is not an upgrade and must go into a **brand-new project**. As a safety net, `001_schema.sql` starts with a guard that is written to stop with a `STOP:` message if those tables already exist (the guard itself is untested, so don't rely on it).
> Never run anything in a folder called `dev_only` except the read-only inspect script described in Part 0.

**Honest status:** the unit tests and static checks ran and passed (see TESTING.md). The SQL, the website build and the browser tests have **never been run**. The steps below are the order that finds problems fastest and risks nothing real.

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
6. Paste `supabase/tests/db_tests.sql` → Run. Success = the message `ALL DB TESTS PASSED`; failure = `FAILED: <name>`. It rolls back and leaves no data. Copy me the exact message either way.
7. **Project Settings → API**: copy Project URL and the anon/publishable key (never `service_role`).

## Part 2: Run on your Mac against the TEST project
Install Node 20+ (nodejs.org). In Terminal, inside this folder:
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
