# Live visitor count

The visitor badge is mounted in src/main.jsx, outside the student/teacher route switch. It appears on student screens, loading and lockdown screens, teacher sign-in, and every teacher dashboard tab.

## How it works
- Uses a public Supabase Realtime Presence channel named sched:visitors. No additional SQL migration, database table, analytics API, or service is needed.
- The browser tracks only {online: true}. It does not broadcast names, emails, booking data, credentials, or IP addresses.
- A random browser key expires after eight hours in localStorage, so multiple same-origin tabs in one browser are grouped under one Presence key.
- This is an approximate count of connected browsers, not verified unique human beings. Another device or private browser counts separately. The teacher panel is included.
- On lost connection, the badge displays — rather than pretending a count of zero; it recovers on resubscription.
- It has Aurora, Fall, Halloween, and Winter styles and sits above mobile navigation. Dialogs and sheets stay above it.
- Presence creates extra Realtime channel traffic. Monitor the Supabase Realtime connection quota if traffic grows.

## Manual verification against TEST
1. Open the student site in one browser and confirm 1 visitor online after connection.
2. Open the same site (same Supabase project) in a separate browser or incognito context; confirm both show 2.
3. Open another tab in the first browser profile; both should still show 2, not 3.
4. Navigate through student calendar, list, booking modal, teacher #admin login, and teacher dashboard tabs. Counter stays visible and agrees across browsers.
5. On TEST, lock and unlock bookings from the teacher panel. Confirm the count remains visible during lockdown and booking security stays unchanged.
6. Verify all four themes on desktop, mobile portrait, and short landscape screens, checking clearances around navigation and locked-screen footer.
7. Close the second browser; after disconnect propagation, the original should show 1. Disconnect the network to confirm the unavailable indicator, not a false zero.
8. Run npm run verify, browser tests, and a real two-browser test against TEST Supabase. Confirm public Presence channels are permitted.

No database migrations should be applied or rerun for this feature. Merge and deploy only after normal CI and TEST verification.
