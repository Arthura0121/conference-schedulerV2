# Aurora After Dark — development QA

Branch: `aurora-after-dark`. LIVE `main` and conference-LIVE must stay unchanged until release sign-off.

## What's implemented
- Student: After Dark monthly calendar, auto Focus Week, enhanced daily panel, appointment list, booking countdown, confirmation, My Booking, and privacy-preserving roster.
- Teacher: command-center Overview plus themed Schedule, Bookings, Settings, Lockdown, editing panels, filtering and bulk action surfaces.
- Responsive layouts, accessible controls and reduced-motion styles.
- TEST-only migration `004_after_dark_15_second_hold.sql`, plus updated client timer, expiry checks, and teacher copy.
- Existing audio preference is on by default and remains user-mutable. Sound effects are triggered only by explicit actions.

## Do not ship until verified
1. On the Mac, pull `aurora-after-dark`. Keep `.env` pointing to conference-TEST (never copy secrets into chats).
2. Run `npm run test:unit` and `npm run build`. Neither needs `.env` removed. To run `npm run verify`, temporarily move `.env` **outside the project folder** and restore it afterward.
3. Confirm student calendar, month navigation and Focus Week with future dates. Test desktop and phone-width layout without sideways scrolling.
4. Test real holds on TEST: 15s expiration, immediate release, competitive booking by two separate students, re-hold not extending, and successful confirmation.
5. Test My Booking / cancellation policy; ensure the 24-hour rule remains server-enforced.
6. Teacher: sign in; verify Overview statistics, Live badge and activity; change an imported slot and check the student calendar; use Add & Tools; verify bulk preview/cancel flow; use Bookings edit/move/swap/cancel on TEST; confirm roster privacy; test lockdown and unlock.
7. Test keyboard-only navigation, sheets with Escape, focus visibility, reduced-motion mode, audio mute, and narrow Chromebook/phone views.
8. Confirm no regressions on TEST before planning version bump, formal SQL migration on LIVE, and deployment to `main` separately.

## Release notes
The source release version remains 2.4.3 until the release is approved. The After Dark branch is not a tested production release. Running `npm run build` does not deploy anything to LIVE.
