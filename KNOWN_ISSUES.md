# Known issues and open items (v2.4.3)

**Read this first:** nothing in this release has been run against a real Supabase/PostgreSQL database or real Realtime. The build environment had no network and no PostgreSQL.

## Not verified (needs YOUR Supabase TEST project, see MANUAL_TEST_CHECKLIST.md)
1. **The phone toolbar fix on a real phone / real browser.** Verified only in headless Chromium against a fake backend, with a *simulated* keyboard and safe-area inset. iOS Safari keyboard behaviour is not proven.
2. **Everything in `supabase/tests/db_tests_v240.sql`** (109 assertions) has never been executed anywhere. It must only be run on a brand-new empty disposable project, never TEST or your original project.
3. **Two students reserving the same appointment.** The database serialises this with a row lock (read from the SQL), but a one-session script cannot prove it. Needs two real browsers at the same time.
4. **Real Realtime behaviour:** reconnection after network loss, tab sleep/resume, duplicate and out-of-order events were NOT re-tested in v2.4.3 (no code change there). The v2.4.2 real-browser results you reported still stand.
5. **Roster scenarios 1-8** (consent / teacher hide / global off) were not re-run in v2.4.3. SQL and the existing unit tests were reviewed only; the roster code was not changed.
6. **Editing a genuine imported appointment** against the real TEST data (calendar sync) is still untested by me. See checklist item 7.

## Found by code reading, NOT fixed (no safe fix without untested SQL)
- **"Close range" tool (`admin_set_range_available`, from migration 001)** has no past-date or draft protection (it only rewrites unbooked, currently open slots, and it never touches paper or booked ones). Use the Bulk tools (which do protect past/draft) for routine work.
- **Student calendar vs teacher list use different date sources.** The student calendar groups by the date computed from `start_at` in the school time zone; the teacher list groups by `slot_date`. They agree for everything created through the app. They could disagree only if the school time zone setting is changed after slots exist. Do not change the time zone setting mid-term.
- **Editing the time of a booked appointment** changes what the student sees under My booking. v2.4.3 now warns the teacher; the student is still not notified automatically.
- **Single-appointment bulk actions in Recent activity** say "1 appointment closed" without date/time/room. Showing it needs a new migration that replaces the `admin_bulk_set_available` security function. I did not write SQL I could not execute. Multi-appointment actions already show counts and a summary.
- **Clearing a selection while scrolled to the very bottom** lets the browser shorten the page by the toolbar's height, so the list ends where the (now shorter) page ends. That is normal browser behaviour, not a bug; selecting never moves the list (tested).

## Test-environment limits
- The browser harness uses React 19 from a global folder and TypeScript transpilation, **not** your Vite/React 18 build. It checks real layout and behaviour of the real `src/` code but is not a production build test. It only runs in the build sandbox; on your Mac use `npm run verify`.
- 1 unit test is skipped until `package-lock.json` exists (it is created by `npm install`).
