# TEST_REPORT v2.4.3 (what actually ran)
Environment: Linux sandbox, Node 22, headless Chromium 141 (Playwright), **no network, no PostgreSQL, no Supabase**.

## EXECUTED and PASSED
| Test | Result |
|---|---|
| `node scripts/check.mjs` (syntax, required files, security checks) | 0 failed |
| Unit tests (`npm run test:unit` file list, run with `node --test`) | 191 passed, 0 failed, 1 skipped (lockfile audit; needs `npm install`) |
| New `tests/unit/bulk243.test.js` (keyboard inset, hidden selection, stale note, FUTURE paper/booked/draft/past eligibility, frozen dialog list, no 150px magic number, BulkBar cleanup) | 9/9 |
| New browser test `bulkbar.mjs` (real rectangles and scroll positions at 320, 375, 390, 430, 768, 1024, 1440px; landscape; resize while selected; simulated 34px safe area; simulated 300px keyboard; 60px URL-bar change; negative control) | 82/82 |
| New browser test `bulksafety.mjs` (hidden selection announced; dialog list frozen while a live refresh happens; stale-preview message; booking untouched) | 11/11 |
| Existing browser harness `run.mjs` (student, teacher, bulk, roster, realtime model, widths) | 136 passed, 0 failed |
| Mutation checks: reverting the scroll-jump fix fails 5 checks; reverting the frozen-dialog fix fails 3; re-injecting the old 150px padding fails the clearance check | confirmed |

## Test problems found and fixed along the way
- Test artifacts (not product bugs): `content-visibility` made list height drift until scrolled; Playwright's own scroll-into-view; one-shot scroll to end. The tests now settle first.
- Old W375/W390/W428 "toolbar does not cover the bottom navigation" failed once under load because it measured during the toolbar's 180ms entrance animation (starts 10px low). It now waits for the animation. Isolated measurement showed an 8px gap at every width. Full re-run: 0 failures.
- A REAL bug in my first fix (scroll jumped up to 66px on first selection) was caught by the new test and fixed.

## NOT RUN (environment unavailable)
`npm install`, `npm audit`, `vite build`, `check-bundle.mjs`, `npm run verify` as a whole, Playwright e2e against Vite, every SQL script (`db_tests_v240.sql`, verify script), real Realtime, real iOS/Android.

## Verified by reading code/SQL only
Bulk SQL order of protections (past, draft, booked, paper), server re-check after row locks, admin check inside the database, rejection of empty/null/over-500 input, roster functions returning no ids, Realtime payload content. No SQL was changed in v2.4.3.

## Needs manual testing on your TEST project
See MANUAL_TEST_CHECKLIST.md and KNOWN_ISSUES.md.

## Not tested this round (no code change, v2.4.2 real-browser results stand)
Reconnection, tab sleep/resume, duplicate/out-of-order events, subscription cleanup, two-student race, roster scenarios 1-8.
