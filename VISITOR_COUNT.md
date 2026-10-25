# Live visitor count

The visitor badge is mounted in src/main.jsx, outside the student/teacher route switch. It appears on student screens, loading and lockdown screens, teacher sign-in, and every teacher dashboard tab.

## How it works
- Uses a public Supabase Realtime Presence channel named sched:visitors. No additional SQL migration, database table, analytics API, or service is needed.
- The browser tracks only {online: true, active: true} while the document is visible and focused. It untracks on tab hiding, window blur, pagehide or freeze, and restores tracking on return. Reading without clicks still counts. It does not broadcast names, emails, booking data, credentials, or IP addresses.
- A random browser key expires after eight hours in localStorage, so multiple same-origin tabs in one browser are grouped under one Presence key.
- This is an approximate count of actively viewing browsers, not verified unique human beings. Another device or private browser counts separately. The teacher panel is included.
- Only metadata with active: true is counted, so older tabs must reload after the update. A browser counts once when any of its tabs is active.
- Track/untrack writes are serialized so delayed replies cannot leave a background tab counted. Failed writes retry after five seconds, using the latest visibility and focus state.
- On lost connection, the badge displays — rather than pretending a count of zero; it recovers on resubscription.
- It has Aurora, Fall, Halloween, and Winter styles and sits above mobile navigation. Dialogs and sheets stay above it.
- Presence creates extra Realtime channel traffic. Monitor the Supabase Realtime connection quota if traffic grows.

## Manual verification against TEST
1. Open the student site in one browser and confirm 1 viewing now after connection.
2. Open the same site (same Supabase project) in a separate browser or incognito context; keep both browser windows visible and focused (for example, use two devices); confirm both show 2.
3. Open another tab in the first browser profile; that browser should still count once. Switch to an unrelated tab or app: its count should drop. Return: it should recover. Minimize the window and lock/unlock a phone to test the same behavior.
4. Navigate through student calendar, list, booking modal, teacher #admin login, and teacher dashboard tabs. Counter stays visible and agrees across browsers.
5. On TEST, lock and unlock bookings from the teacher panel. Confirm the count remains visible during lockdown and booking security stays unchanged.
6. Verify all four themes on desktop, mobile portrait, and short landscape screens, checking clearances around navigation and locked-screen footer.
7. Close the second browser; after disconnect propagation, the original should show 1. Disconnect the network to confirm the unavailable indicator, not a false zero.
8. Run npm run verify, browser tests, and a real two-browser test against TEST Supabase. Confirm public Presence channels are permitted.

No database migrations should be applied or rerun for this feature. Browser visibility and focus are signals of foreground viewing, not proof of human attention. Another device/private browser still counts separately; blocked localStorage can prevent tab deduplication. Abrupt network loss may remain counted briefly until the server detects disconnection.

Automated unit tests cover foreground/background transitions, zero counts, deduplication, page lifecycle events, network recovery, in-flight races and cleanup. Browser layout checks use mocked scheduling data; they do not validate a live Supabase connection.
