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

# v2.1.1 (database test failure)
| # | Finding | Fix |
|---|---|---|
| B1 | `db_tests.sql` line 138 mixed a data-changing call and a direct read of the changed row in one expression (PostgreSQL snapshot rule), so it could fail even when `admin_edit_booking` works. Four sibling assertions had the same shape but read through a volatile function | Split into separate statements; lint added to `check.mjs` (flags the 5 old lines, 0 in the new file) |
| B2 | Test failures gave only a label, no cause | Failure message now includes the last backend call's returned error text |
| B3 | No way to check one feature quickly | `supabase/tests/diag_edit_booking.sql` |
No change to `001_schema.sql`: nothing in `admin_edit_booking` was found wrong. If the corrected test still fails there, the new message will identify the real error.

# v2.1.2 (no visible pass confirmation)
| # | Finding | Fix |
|---|---|---|
| C1 | DB test ended with ROLLBACK, pass message was only a NOTICE, so a successful run looked identical to "nothing happened" | Final result row with counted assertions (expected 94) and leftover-row check; static checks tie the number to the file and SETUP.md |
| C2 | No way to confirm an earlier run | Read-only pg_stat_statements query in SETUP.md (best-effort, unproven) |
No change to `001_schema.sql` or `seed.sql`.

# v2.1.3 (result reporting)
| # | Finding | Fix |
|---|---|---|
| D1 | v2.1.2 created its counter before `begin;`; PostgreSQL runs a whole script as one transaction and `begin` absorbs earlier statements, so `rollback` deleted the counter (your 42P01 error) | No transaction-control statements; savepoint-based rollback inside `pg_temp.run_db_tests()`; result is the last statement |
| D2 | Static check only matched text | Rewritten as structural/ordering analysis, 9 mutation tests |
| D3 | Tests would misreport on a project that already had bookings | Guard: refuses to run |
No change to `001_schema.sql` or `seed.sql`; all 84 assertions unchanged.

# v2.1.4 (stale teacher dashboard)
| # | Finding | Fix |
|---|---|---|
| E1 | Teacher pages fetched once (mount, range change, own actions); no polling, no Realtime. Student side only "looked live" because it polls every 15 s | Shared `startPolling` (5 s teacher, 15 s student): visible-only, refresh on focus/online, one request at a time, recovers from hung requests, cleanup removes timer and listeners |
| E2 | Realtime not viable without exposing tables: no RLS policies, no grants, no publication | Not added. Polling uses the existing RPC functions; database security unchanged (SQL byte-identical) |
| E3 | Any failed fetch logged the teacher out | Only auth errors show sign-in; network errors show "Connection problem" and auto-retry |
| E4 | Out-of-order responses could overwrite newer data; all 5 endpoints loaded for every tab | `makeLatest` guard; per-tab data (`adminData.js`) |
| E5 | Form state would be clobbered by every poll | Settings form re-synced only when its own fields change on the server |
| E6 | App polled student data behind the teacher page | Disabled while the teacher page is shown |
Known behaviours: an unsaved edit in a Schedule row is reset if another user changes that slot's time/room; if another teacher changes the rules text while you are typing in that box, your text is replaced on the next poll. Updates arrive within one poll interval (up to 5 s teacher, 15 s student), not instantly. Hold countdowns are unchanged.

# v2.1.5 (npm audit: vite and esbuild)
| # | Finding | Fix |
|---|---|---|
| F1 | Vite 5.x is end of life: the high-severity dev-server advisory GHSA-fx2h-pf6j-xcff was fixed only in 6.4.3, 7.3.5, 8.0.16; Vite 5 bundles esbuild 0.21 (GHSA-67mh-4wv8-2f99, fixed 0.25.0) | vite `^7.3.6`, plugin-react `^4.7.0`, esbuild `^0.25.12`, engines + Node 22 in the workflow |
| F2 | No offline guard against regressing to a vulnerable tree | `tests/unit/deps.test.js` (manifest always; lockfile automatically once `package-lock.json` exists) |
| F3 | No lockfile in the delivered ZIP | Still none: it must be generated by `npm install` on your machine (see TESTING.md Round 7) |
Impact note: these are dev-server issues; the built site served from GitHub Pages does not contain Vite's dev server. Not changed: application code, Supabase security, SQL, seed.
Residual risks: Vite 7 build never run by me; `@playwright/test ^1.47.0` left as is (its resolved version in your lock decides whether audit flags it); the dependency guard's advisory table is a snapshot of 13 Oct 2026, not a live feed.

# v2.1.6 (UPDATE without WHERE)
| # | Finding | Fix |
|---|---|---|
| G1 | `admin_set_lockdown`, `admin_update_settings`, `admin_end_edit`: `update settings` with no WHERE, rejected by Supabase's API roles (pg-safeupdate, error 21000). "Lock now" was broken for API users | `where id=1` in `001_schema.sql` and `002_fix_unqualified_updates.sql` |
| G2 | My DB tests ran as `postgres` in the SQL Editor, where the guard is absent; `admin_update_settings` had no test | SQL linter in `check.mjs` + unit tests + `verify_functions.sql` + 14 new DB assertions (108) |
| G3 | Test files contained unqualified updates | Added WHERE |
| G4 | Existing TEST database needed a safe upgrade path | `002` (functions only, guard + post-check, no data statements) and a 6-step procedure |
Audit result: 3 of 24 UPDATE/DELETE statements lacked WHERE; the others were already correct; no intentional bulk operations. Student booking logic, the other 28 functions, security restrictions (RLS, grants), seed and the app code are unchanged.
Residual risks: SQL never executed by me; regex-based catalog/linter checks can miss unusual hand-written SQL.


# v2.4.0
| # | Finding | Action |
|---|---|---|
| H1 | `admin_set_range_available` closes every available unbooked slot in a range and reopens only 'Closed by teacher'; it has no past/draft guard | Left unchanged; new `admin_bulk_set_available` with shared classifier and protections |
| H2 | Polling was the only sync | Realtime signals via DB triggers; polling kept as fallback |
| H3 | `.tview`/`main` animations used fill-mode `both`, leaving a transform that breaks `position:fixed` descendants | Changed to `backwards`; toolbar also portaled |
| H4 | check.mjs flagged `<ActivityTimeline` as React 19 `<Activity` | regex now needs a word boundary |
Residual: SQL unexecuted; no real-Supabase test; paper override remains the existing per-slot editor action with a warning (server rule: teacher only).

---
# v2.4.2 (re-audit: verification script, transaction assumptions, migration 003 runtime review)
**Method:** read the v2.4.1 verify script statement by statement; checked the XPath logic with libxml2 (`xmllint`, Python `lxml`) against hand-written XML in each shape the PostgreSQL manual documents for `query_to_xml`; re-read migration 003, 001, 002, `db_tests_v240.sql` and the frontend RPC calls. **No PostgreSQL was available (no server, no client library, no network): nothing in this release was executed in PostgreSQL.** The XML used in the libxml2 checks was written by hand from the documented shapes, it was NOT produced by PostgreSQL.

## Defects found and fixed
| # | Where | Problem | Fix |
|---|---|---|---|
| X1 | verify, checks 70-73 | Five `/row/c/text()` paths. The calls were `query_to_xml(...,false,true,'')` = `tableforest = true`, whose single-row output is a bare `<row>`: the path matched that shape only. In the `<table><row><c>` document (`tableforest = false`, what the manual shows and what the reviewer saw) it matches nothing, and the value would show as `?` (70, 71) or a FAIL (72, 73). libxml2 confirms both behaviours. | `tableforest = false` and path `/table/row/c/text() \| /row/c/text()`; tested with libxml2 on both shapes. |
| X2 | verify, same probes | With `tableforest = true`, zero rows give an empty value and several rows a multi-root fragment. `xpath()` requires a single-root document, so such a result would be expected to raise an error that aborts the WHOLE report (libxml2 rejects both: "Document is empty", "Extra content"). Only the one-row case was safe; check 70 returns zero rows if the settings row is missing. | `tableforest = false` always yields one `<table>` root, so an empty result is an empty node set (reported as FAIL), never an exception. **Expected from the documentation, not observed in PostgreSQL.** |
| X3 | verify, 70-73 | `coalesce(...,'?')`: checks 70 and 71 (INFO) displayed `?` as if it were data; 72 and 73 failed without saying why. | A probe with no value is a FAIL whose detail contains the first 160 characters of the raw XML. |
| X4 | verify, 72 | The same query ran twice (once for the status, once for the detail). | Four probe CTEs (`raw`, `probe`), each query executed once, and only when the catalog says 003 is fully installed. |
| X5 | verify, 73 | `?&` operator: some clients treat `?` as a parameter marker. | Count of `jsonb_object_keys` in the six names. |
| X6 | verify, transaction | The header said `SET TRANSACTION READ ONLY` as the first statement made the script safe. It only applies inside a transaction block. Sent one statement at a time (autocommit), PostgreSQL prints a warning (25P01), ignores it, and the SELECT runs unprotected. How the Supabase SQL Editor submits a script was never confirmed. | The script is ONE statement (no `SET`, `BEGIN`, `COMMIT`, no second statement, no semicolon except the terminator). Read-only is a property of its text (unit-tested), and says so. New row "transaction mode of this run" reports `transaction_read_only`. Optional `psql` read-only-transaction recipe in the header (not executed). |
| X7 | verify | Two inherited semicolons (a comment and a string literal) would break a client that splits on `;`. | Removed (tested: the file has exactly one). |
| X8 | verify, 72 | "returns ZERO rows when nobody is signed in (even if the switch is on)" passes vacuously while the switch is OFF. | The detail says whether the switch was on or off, so a PASS is not over-read. |
| X9 | verify, F | No check that the role owning `rt_notify` can insert into `realtime.messages`; a swallowed failure shows only as "no live updates". | New check 64 (catalog only, WARN level). |
| M1 | 003 guard | Row level security on `realtime.messages` was required by the verify script (FAIL) but not by the migration, so a project without it could install 003 and then fail verification, with receive policies not enforced. | Guard before the first change: refuse with a clear message. **The only change to 003.** |

## Migration 003: re-audited, no further defect found by reading
Checked and found consistent (each is static reading or a script, NOT PostgreSQL execution):
- **Trigger definitions:** all 13 are `AFTER ... REFERENCING NEW|OLD TABLE AS changed FOR EACH STATEMENT`, valid forms (NEW for INSERT, OLD for UPDATE/DELETE, no column list, plain tables); the trigger functions return `null` (correct for AFTER) and read `changed` only inside plpgsql (resolved at run time). PostgreSQL checks EXECUTE on a trigger function when the trigger is created, not when it fires (from the documentation), so revoking it from browsers is safe. Triggers fire inside SECURITY DEFINER functions, which run as the owner.
- **Privileges:** every new function is revoked from `public, anon, authenticated` and only the 9 browser functions are granted to `authenticated`; 001 already revokes default function privileges and the 003 self-check re-tests the result.
- **Signatures:** the verify script's function list equals the created functions (unit test); every frontend `rpc` parameter name matches the SQL (`p_slot, p_name, p_assignment, p_show_name, p_show, p_ids, p_avail, p_include_other, p_dry_run, p_slots, p_hidden, p_on, p_limit`: PostgREST matches by name). Old overloads are dropped first and a self-check counts one version each of `confirm_booking`, `my_booking`, `admin_bookings`.
- **Return types** of the `RETURNS TABLE` functions equal the column types in 001 (`period int`, `timestamptz`, `bigserial` = `bigint`, `text`, `date`): a mismatch would fail at CREATE time for the SQL-language functions.
- **Name collisions:** in the plpgsql functions whose OUT columns share names with table columns (`admin_bookings`, `admin_activity`) every column reference is table-qualified; no `RAISE` format string has a stray `%`; every UPDATE and DELETE has a WHERE (the `pg_safeupdate` rule); `require_admin` is called in all 24 other `admin_*` functions (verify check 37).
- **Frontend contract:** unchanged. A 3-argument `confirm_booking` call still works (default parameter).

## SQL tests (`db_tests_v240.sql`, `db_tests.sql`): re-read, unchanged
I found no defect I could demonstrate by reading. They remain **never executed** and depend on Supabase internals listed in their headers (columns of `realtime.messages`, `authenticated` being able to SELECT from it, the `postgres` role being allowed to insert signals).

## Needs real Supabase / PostgreSQL (cannot be proven by reading)
- The exact XML text PostgreSQL returns from `query_to_xml(...,false,false,'')`, and that its `xpath()` accepts the `|` path (libxml2 does).
- Whether the Supabase SQL Editor submits a script as one batch (no longer matters to the verify script).
- Everything listed under v2.4.1 "Needs real Supabase" below.

# v2.4.1 (independent database audit of migration 003 and its scripts)
**Method:** read 001, 002, 003, every SQL test and script, the Realtime client, the roster/bulk frontend code and the unit tests. **Nothing here was executed in PostgreSQL** (none was available); every finding is from reading the SQL, and every fix is covered only by static tests. Where a claim depends on how Supabase behaves, it is listed under "Needs real Supabase".

## Defects found and fixed
| # | Where | Problem | Fix |
|---|---|---|---|
| V1 | `verify_v240_READONLY.sql` | Named 003-only columns directly in SQL text. PostgreSQL resolves column names while parsing, so on a v2.3.0 database the whole statement failed ("column ... does not exist") before any `EXISTS` guard could run. Also: `information_schema.columns` was not schema-qualified, `routine_privileges` can hide grants from the current role, nothing said whether 003 was installed, and a missing object produced fewer rows rather than a failure. | Rewritten. Catalog lookups (`to_regprocedure`, `pg_attribute`, `pg_trigger`, `pg_policies`, `has_function_privilege`, `aclexplode`), `query_to_xml` for the few data reads (parsed only if executed, which only happens when the catalog says 003 is installed), READ ONLY transaction, explicit installation state (none / full / partial), VERDICT row, SKIP vs FAIL logic. |
| V2 | 003 `admin_bulk_set_available` | **Lock order.** It locked slot rows, then `touch_edit_lock()` locked the settings row. `admin_upsert_slot`, `admin_set_available` and `admin_set_range_available` take the settings row first. With "lock while editing" on, two teacher actions could deadlock (PostgreSQL would abort one with 40P01). | `touch_edit_lock()` now runs before the slot locks. Unit test compares the order with 001. |
| V3 | 003 `bulk_classify` / bulk | **NULL `p_include_other`** made `not p_include_other` NULL, so the "needs opt-in" branch never fired and every non-paper closed slot became eligible: the opt-in protection could be bypassed by a malformed call. | NULL flags rejected with `invalid_input`; tested. |
| V4 | 003 bulk | NULL elements in the id list were counted as "missing" and inflated `requested`. | Ignored; an all-NULL list is `invalid_input`. |
| V5 | 003 bulk | Classified twice (summary, then again inside the UPDATE) and then deleted holds from EVERY "Closed by teacher" slot in the list, including slots this run did not close. | One classification after the locks; its eligible ids are used for the update and the hold cleanup. |
| V6 | 003 bulk | A plain `DELETE FROM holds` on a slot whose row we hold locked can deadlock with the housekeeping delete at the start of `hold_slot` (it locks expired hold rows BEFORE it takes the slot lock). | Only live holds on slots actually closed, selected with `FOR UPDATE SKIP LOCKED`. |
| V7 | 003 `admin_activity` | `array_agg` over `regexp_matches` has no guaranteed order, so a move/swap could show from and to reversed. | `WITH ORDINALITY` + ordered aggregate. |
| V8 | 003 `bulk_classify` | Paper test was case-sensitive (`like`). A hand-typed "taken on paper" could be reopened with the opt-in flag. | `ilike`. |
| V9 | 003 guard | Did not check 002, `realtime.topic()`, `realtime.messages`, or a partial earlier run (columns use `if not exists`, so a half-applied file could be re-run into confusing errors). | Guard rewritten (all checks before the first change). |
| V10 | 003 functions | `search_path=public` leaves `pg_temp` searched first for tables. | `public,pg_temp` on all 16 new or replaced SECURITY DEFINER functions. Not reachable through the API (no temp objects), so defence in depth only. |
| V11 | 003 `rt_notify` | A swallowed failure vanished silently, so broken Realtime would look like "polling only". Both sends shared one block. | Separate blocks; `RAISE WARNING` (visible in Dashboard > Logs > Postgres). |
| V12 | 003 end | No proof the privilege model came out as designed. | Self-check DO block: 13 statement-level triggers, 2 SELECT policies, no internal helper or anon-executable function, no stale overloads, every SECURITY DEFINER has a search_path. Raises, so the whole migration rolls back. `notify pgrst` added. |
| V13 | `db_tests_v240.sql` | (a) After the roster section the JWT claims still belonged to a student, so every teacher call (`admin_set_name_hidden`, `admin_bulk_set_available`) would raise `forbidden` and the run would stop. (b) "students cannot call teacher roster functions" used `'x'::uuid`, which fails the cast, so it passed without testing authorization. (c) Whole-table counts with only a "no bookings" guard, so it could fail or mislead on a seeded project. (d) No test of Realtime payloads or policies, of legacy rows, of `list_roster` without a session, of NULL arguments, or of signal counts. (e) Event counts were global. | Rewritten (112 assertions). Fixtures only; refuses unless the database is EMPTY; teacher claims set explicitly; valid-uuid negative tests; events counted from a captured id; Realtime assertions; extra snapshot check `data_unchanged`. |
| V14 | `db_tests.sql` | `... 'student cannot edit settings') where id=1;` had `where id=1` outside the string (an artifact of the v2.1.6 WHERE fix): a PL/pgSQL error. Header said 94 assertions, code 108. | Moved inside the string; header corrected; warning label added. |
| V15 | `rollback_003_REVIEW_FIRST.sql` | Could run half way on a database without 003. | Guard first; `notify pgrst`. |

## Reviewed and found correct (no change)
Trigger syntax (`AFTER ... REFERENCING OLD|NEW TABLE ... FOR EACH STATEMENT`; `ON CONFLICT DO NOTHING` in `admin_copy_schedule` is compatible with transition tables); `realtime.send(jsonb,text,text,boolean)` argument order; SELECT-only `realtime.messages` policies; no dynamic SQL anywhere in 003 (no injection surface); grants (internal helpers revoked from `public,anon,authenticated`, browser functions to `authenticated` only; new functions get explicit revokes because schema default privileges cannot remove the global PUBLIC grant); `confirm_booking` body identical to 001 apart from the consent flag (unit-tested); booking/hold concurrency (`hold_slot`, `confirm_booking`, `admin_move_booking` and bulk all serialize on the slot row, and bulk classifies only after locking; under READ COMMITTED each statement sees rows committed by the session it waited for); existing bookings are never closed, cancelled or moved by bulk; legacy bookings default private; legacy events (`meta` NULL) still render; paper-reserved slots are protected ahead of eligibility; the teacher can only hide, never set consent; `list_roster` withholds the name inside the query.

## Known limitations that remain (decisions or facts you should know)
1. **Roster audience (privacy).** `list_roster()` answers any signed-in session, and every visitor gets an anonymous session. If the teacher turns the roster ON, a consenting student's name is visible to anyone who opens the site, not only classmates. The consent text says "class roster". Mitigations in the design: default OFF, per-student consent, teacher hide, hidden during Lockdown, nothing returned without a session. A real gate (for example "only sessions that hold a booking may list the roster", or a class code) would change behaviour, so it was NOT added. See PRIVACY.md.
2. `hold_slot` (unchanged, v2.3.0) deletes expired holds before it takes the slot lock. Against `admin_set_available` that can still deadlock in a rare timing window; PostgreSQL detects it and aborts one statement with 40P01 (a retry fixes it). Not changed because it is pre-existing and deployed.
3. Every booking change signals every open student page, which then refetches `list_slots` (client debounce 150 ms). Fine for one class; many hundreds of simultaneous students would be a lot of reads.
4. Hold expiry produces no database event; clients re-check on timers (`nextCheckMs`).

## Needs real Supabase (cannot be proven by reading)
- `realtime.send` runs for the role that applies the migration (its owner needs EXECUTE; `verify_v240_READONLY.sql` check F reports this). It swallows its own errors (WARNING `ErrorSendingBroadcastMessage`).
- Realtime evaluates the two policies when a browser joins a private channel, with `realtime.topic()` set to the joined topic and the JWT claims set (so `auth.uid()` works inside `rt_is_admin()`). Anonymous-auth sessions carry the `authenticated` role. The SQL tests emulate this by setting `realtime.topic`; the real check is two browsers (see REALTIME.md).
- The columns of `realtime.messages` (`topic, extension, payload, event, private`) as used by `db_tests_v240.sql`.
- (v2.4.1 item, resolved in v2.4.2) Whether the SQL Editor honours `SET TRANSACTION READ ONLY` as the first statement: no longer used; see X6.
- All SQL in this release has only been read, never run.
