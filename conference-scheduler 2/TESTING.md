# Testing: real results (v2.1)
Environment: Linux sandbox, Node v22.22.2, Python 3 with pdfplumber, **no network, no PostgreSQL, no npm install possible**.
Labels: **EXECUTED** = code ran and passed. **STATIC** = a script ran and inspected source text (it did not run the code under test). **NOT RUN** = could not run here.

## EXECUTED and passed
| Command | Result |
|---|---|
| `node --test tests/unit/lib.test.js tests/unit/seed.test.js` | 20 passed, 0 failed (11 helper tests: time zones/DST, calendar grid, 60 s countdown, 24 h boundary; 9 seed tests) |
| Seed vs the PDFs: grid re-read from the 3 PDFs with pdfplumber (`tests/fixtures/pdf_grid.json`, codes only) and compared with `seed.sql` by the unit test | 60/60 rows equal after the fix. Totals asserted: 180 slots = 70 not-available + 109 paper-taken + 1 open; from 10/13: 48 = 21 + 27 + 0 |

## STATIC (script executed; SQL and UI were NOT executed)
`node scripts/check.mjs`: **117 passed, 0 failed, 0 skipped**: RLS enabled on 6/6 tables; no grants to anon, no policies; `require_admin()` present in 19/19 teacher functions; 13 frontend RPC names exist and none is an internal helper; 32 frontend calls match SQL parameter names exactly; 31 SQL function bodies have balanced if/end if, begin/case/end and parentheses; no keys/JWTs/.env; seed has no names; JSX syntax of 5 source files (via TypeScript's transpiler, esbuild unavailable here).
Negative tests (copies with deliberate damage): checker correctly FAILED on bad JSX, a missing `require_admin()`, an extra frontend parameter, and an unbalanced `if`.
These are **not** proof the SQL works. PostgreSQL has never parsed these files.

## NOT RUN
| Item | Why |
|---|---|
| Any SQL (schema, seed, functions) | no PostgreSQL. Highest remaining risk |
| `supabase/tests/seed_check.sql` (7 checks) and `supabase/tests/db_tests.sql` (80 assertions: RLS, holds, expiry, lock, edit lock, cancel rule, copy/publish, swap/move/edit, range reopen) | need a Supabase test project |
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
