# Audit of v1 (conference-scheduler.zip) and what v2 changed
| # | Finding in v1 | Severity | v2 |
|---|---|---|---|
| 1 | No schedule editor, template copy, dashboard, calendar grid, drafts/preview, bell-period config | Missing | Added (Schedule, Dashboard tabs; `admin_upsert_slot`, `admin_copy_schedule`, drafts + publish) |
| 2 | Admin could not move/swap/edit bookings, no audit log | Missing | `admin_move_booking`, `admin_swap_bookings` (deferrable PK), `admin_edit_booking`, `admin_events` |
| 3 | Teacher could not see slots, names, or stats (no admin list functions) | Missing | `admin_slots`, `admin_bookings`, `admin_stats` |
| 4 | `my_booking` returned column `name` and helper functions (`is_admin`, `is_locked`) were browser-callable | Low | Helpers revoked; `require_admin()` internal |
| 5 | Unique-violation on confirm always reported "already booked" | Bug | Distinguished `taken` vs `already_booked` |
| 6 | Seed was sample data only; real schedule from PDFs not preserved | Gap | Seed encodes all 3 weeks (60 day/period rows), rooms (436B from 10/5), Not Available cells, paper-booked slots (no names) |
| 7 | Auto-lockdown while editing not implemented | Missing | `admin_begin_edit` (opt-in, auto-expires 30 min) |
| 8 | Past slots, drafts, blank names not handled server-side | Gap | Rejected in `hold_slot`/`confirm_booking` |
| 9 | `lock` could be defeated by cancelling during lockdown | Gap | `cancel_my_booking` honors lockdown |
| 10 | Admin FK to auth.users blocked DB tests | Test gap | FK removed; admins still only addable by SQL Editor |
| 11 | No tests, no static checks, no bundle scan, no CI gate | Gap | 16 unit tests, 56 static checks, ~55 DB assertions, 3 e2e tests, CI runs check+tests |
| 12 | Calendar was a button row; no keyboard-friendly modal | Gap | Month grid; native `<dialog>` (focus trap, Esc) |
Defects found by RUNNING the new checks: (a) `node --test <dir>` fails on Node 22 → explicit file list; (b) ASI bug in `scripts/check.mjs` (line starting with `/`) → fixed.

# v2.1 audit (this round)
| # | Finding | Fix |
|---|---|---|
| A1 | Seed: 1 blank cell (Wed 9/30 P9 #3) was mis-seeded as taken. Everything else matched. Of 180 slots 70 N, 109 P, 1 open; **0 open from 10/13** | Fixed; unit test compares the seed with a PDF-derived fixture and asserts counts; `seed_check.sql` asserts the same in the database |
| A2 | Setup could be pasted into the old v1 project | Prominent warning, DB guard at top of `001_schema.sql`, read-only inspect script, separate TEST → LIVE procedure; removed the destructive reset script |
| A3 | **Edit lock** locked students 30 min after a single edit, was applied by the browser before the action (so failed actions still locked), and also locked on copy/publish. No banner | Lock now applied inside the slot-changing functions only (edit, delete, close/reopen), rolling 10 min, rolled back if the change fails, banner + Finish editing, `admin_begin_edit` removed |
| A4 | "Reopen range" re-opened **every** closed slot including Not-Available and paper-taken ones (double-booking risk) | Reopens only slots that "Close range" closed |
| A5 | Marking a booked slot unavailable hid the booking from the calendar; delete/move/set on missing rows silently did nothing | `has_booking` / `unavailable` errors; move target must be non-draft |
| A6 | "Save schedule" silently cleared a manual lock; reopen time without a start was ignored; no way to "lock now, reopen at 3 pm" | Save keeps manual lock; until requires from; Lock now + Reopens at supported |
| A7 | Period outside 1–9 gave a raw error | `invalid_input` |
| A8 | Verification gaps | New static lints (param names, SQL structure), 80 DB assertions (not run), PDF-derived seed test |
Not fixed / still open: SQL never executed; no concurrency test with two real sessions; no bell-period template editor; no component tests; no import of existing bookings; overlapping slots in a copy only caught when start+room are identical.
