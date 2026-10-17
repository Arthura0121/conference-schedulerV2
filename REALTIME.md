# Realtime (Aurora v2.4.3)

## How it works
1. Database triggers (migration 003) fire **once per statement** on `slots`, `holds`, `bookings`, `settings` (and `admin_events`).
2. Each trigger calls `realtime.send({v:1,kind}, 'sync', topic, private=true)`. Topics: `sched:public` (students and teachers) and `sched:admin` (teachers only; the policy calls `rt_is_admin()`).
3. The payload is only `{v:1, kind}` with kind in slots / holds / bookings / settings / activity. **No names, assignments, ids, emails or session ids are ever sent.**
4. Browsers join **private** channels. The only policies on `realtime.messages` are two `FOR SELECT` policies. There is **no INSERT policy**, so a browser cannot publish or forge a signal. The app code never calls `.send` (a static check enforces this).
5. A signal only means "refetch". The page calls the same function-only RPCs as before. **A booking succeeds or fails on the database response, never on a signal.**
6. Signal sending is wrapped so a Realtime failure can never fail a booking. Since v2.4.1 a swallowed failure leaves a WARNING in the Postgres log (Dashboard > Logs > Postgres) so a broken setup can be diagnosed instead of looking like "polling only".

## Client (`src/realtime.js`)
- Initial data is fetched immediately; the socket never blocks it. Auth is set (`setAuth`) before subscribing.
- After every (re)subscription a fetch is made; the badge shows **Live** only after that fetch succeeded.
- Signals are debounced (150 ms) and coalesced; only one fetch is in flight, plus at most one follow-up.
- Stale responses are ignored (`makeLatest` in Admin; one-at-a-time in the controller).
- Fallback: when not Live, poll every 15 s (student) / 5 s (teacher). When Live, a slow safety check every 60 s / 30 s. Hidden tabs are not polled; returning to a tab refetches. Offline stops polling; coming back refetches.
- Time-based changes produce no database event, so timers re-check: a visible hold (60 s + 1 s) and scheduled lockdown / editing-lock boundaries (`public_state.next_change`, `admin_settings`).
- `stop()` removes the channel, listeners and timers. A stop during the async setup never creates a channel.

## Cost
Each change inserts 1-2 small rows in `realtime.messages` (kept 3 days). Well inside free-plan limits for one classroom.

## What is NOT verified
Real Supabase Realtime was not exercised in this build (no network). See TESTING.md.

## Authorization model (v2.4.1 review)
- **Receive:** `sched_public_receive` lets any `authenticated` session join `sched:public` (students are anonymous-auth sessions, which carry that role). `sched_admin_receive` needs `rt_is_admin()` (a row in `admins`) for `sched:admin`. Realtime evaluates them when the browser joins the channel.
- **Send / forge:** there is NO insert, update, delete or all policy on `realtime.messages`, and the app never calls `.send`. Only database triggers (running as the function owner) insert signals. `verify_v240_READONLY.sql` FAILs if any other policy permits INSERT/UPDATE/DELETE/ALL on `realtime.messages`, and WARNs about any other SELECT policy (a permissive one would widen who can read `sched:admin`).
- **Payload:** `{v:1, kind}` only. `db_tests_v240.sql` asserts exactly those two keys on every signal and that no name, assignment or "@" ever appears.
- **Reconnect:** after every (re)subscription a full refetch is made before the badge says Live. Polling (15 s student / 5 s teacher) runs only while not Live; while Live there is a slow safety check (60 s / 30 s).
- **Time-based changes** (hold expiry, scheduled lockdown) produce no database event; timers re-check (`nextCheckMs`).

## Assumptions that need a REAL Supabase test (not provable by reading or by the unit tests)
1. `realtime.send` is executable by the role that applied the migration, and inserts into `realtime.messages`. (`verify_v240_READONLY.sql` checks 63 and 64 report the execute and insert privileges; check 64 is a WARN, because a failed signal is swallowed and the site then only polls.) Migration 003 refuses to run if row level security is off on `realtime.messages`.
2. The join-time policy evaluation sets the JWT claims so `auth.uid()` works inside `rt_is_admin()`.
3. An anonymous-auth student session can join `sched:public` and is refused `sched:admin`.
4. A client that tries `channel.send(...)` on a private channel is refused.
5. Dashboard > Realtime > Settings: private channels work with "Allow public access" on or off.

**Two-browser checklist (about 10 minutes, conference-TEST, after the migration):** (a) Teacher page open in browser 1, student page in browser 2. (b) Book a slot in browser 2: browser 1 updates within a second or two and shows Live. (c) Close a slot in browser 1: browser 2 updates. (d) Turn browser 2 off (airplane mode): badge becomes Reconnecting/Offline; turn it on: it refetches and returns to Live. (e) In browser 2's console, try `await window.supabase`-free check: the app exposes no client, so instead confirm in the Supabase Realtime Inspector (Dashboard > Realtime) that a normal (non-admin) anonymous session joining `sched:admin` is rejected.

