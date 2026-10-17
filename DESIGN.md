# AURORA design system (v2.3.0, "Evolution")

Identity: the Aurora midnight base with violet, cyan and mint light, now built around one recurring shape, **the ribbon** (a short rounded bar). It is the logo (three ribbons of unequal length plus a rising sun-dot: an "E", a schedule, and aurora bands), the per-appointment marks inside every calendar day, the accent under panel headings, the active-tab indicator, and the stacked bar on the teacher Overview. Nothing here is borrowed from another product.

## Information architecture
| Surface | Desktop (>= 1000 px) | Phone (< 640 px) | Tablet (640-999 px) |
|---|---|---|---|
| Student | slim rail (Calendar, Times, Rules, sound) · month workspace · **contextual panel** (day times, then booking steps, then success; your booking and the Rules stay in view) | compact top bar · calendar · bottom tab bar · **bottom sheet** for day, booking and success | phone layout; sheets are centered dialogs |
| Teacher | left rail (Overview, Schedule, Bookings, Settings, Lockdown with a live state dot) · list · **editor panel** that stays beside the list | top bar · bottom tab bar (five sections) · editors open as bottom sheets · filter chips scroll sideways | phone layout with centered sheets |

The panel/sheet content is the same component, so desktop and phone behave identically; only the container changes.

## Tokens (`src/style.css`, the only place values are defined)
Color (`--bg #080B18`, `--navy`, `--surface`, `--surface-2/3`, `--violet`, `--cyan`, `--peri`, `--mint`, `--rose`, `--amber`, `--text`, `--muted`, `--faint`, `--slate`, `--ribbon` gradient) · space `--s1..--s7` (4-48 px) · radii `--r-sm..--r-xl`, `--r-pill` · depth `--sh-1..--sh-3`, `--glow` · layers `--z-sticky/nav/sheet/toast` · safe areas `--safe-t/b/l/r` · type (system stacks only) · motion `--ease-out`, `--ease-spring`, `--ease-in`, `--fast .14s`, `--med .26s`, `--slow .48s`. Breakpoints (documented in the file, media queries cannot read variables): 640 and 1000.
Files: `style.css` (tokens, base, atmosphere, keyframes, reduced motion) · `styles/ui.css` (buttons, pills, fields, sheet, toasts, empty/loading) · `styles/student.css` · `styles/teacher.css`.

## Components (`src/components`, `src/student`, `src/teacher`)
Shared: `Icon` (one 24 px stroke set), `Brand/Mark/AuroraArt`, `Button`, `Pill/KindPill`, `Field`, `Empty`, `Skeleton`, `Sheet` (native `<dialog>`: focus trap, Esc, backdrop, focus return; animates out), `ToastProvider/useToast`, `ConfirmProvider/useConfirm` (replaces the browser's own confirm/prompt), `useGlow` (pointer lighting), `useMedia`.
Student: `Shell` (Rail, TopBar, BottomNav), `MonthCalendar`, `SlotCard`, `DayPanel`, `ListView`, `BookingFlow` (+ `HoldTimer`), `Success`, `MyBooking`, `SoundToggle`.
Teacher: `Shell` (rail, bars, SignIn), `Overview`, `Schedule`, `SlotEditor`, `ScheduleTools`, `Bookings` (+ `BookingEditor`), `SettingsView`, `LockdownView`.
Pure logic (unit tested): `slotInfo.js` (classification, "what students see", save outcomes, filters, grouping, school-clock dates), `ics.js`.
`App.jsx` and `Admin.jsx` stay as the orchestration layer (polling, auth, actions) so the v2.1.x live-update and security invariants are still verified by `npm run check` exactly as before.

## Status language (never color alone)
Calendar day: number + text (`2 open`, `full`, `closed`) + border style (solid, dashed, faded/struck) + one ribbon per appointment whose **shape** differs (filled = open, striped = held, short = booked, outlined = unavailable). Teacher rows: pill with text and a distinct marker shape, plus a separate **Past** tag, because "past" can apply to any state.

## Motion system
One vocabulary, transforms and opacity only (the hold ring animates one `stroke-dashoffset`): `rise` (content entering, staggered 50 ms by period), `pop` (dialogs), `sheet-up/down` (phone sheets), `slide-l/r` (month change follows the direction of travel), `selpop` (a chosen day springs), `draw` (success check), `confetti` (18 CSS pieces, 1.1 s, once), `pulse-warn` (last 10 s of a hold), `shimmer` (loading), count-up on teacher KPIs (650 ms, skipped under reduced motion), pointer-follow lighting on cards (two CSS variables, mouse only). `prefers-reduced-motion: reduce` sets every animation and transition to none, shows the finished check, and the count-up and sheet exit skip straight to the end. Nothing loops except the very slow ambient drift of the background and the loading shimmer.

## Booking flow
Pick day (tick) → Reserve (select; the server hold starts) → details with a draining 60 s ring (`role=timer`, one polite announcement at 10 s) and inline validation → Confirm → success ticket with **Add to calendar (.ics)**, built in the browser from the slot the server confirmed. Expired hold: a banner with "Reserve again" when that time is still open. Choosing another day releases the hold. Cancel always asks first, in the page, and states the consequence. The success state appears only after `confirm_booking` returns; sound never gates it.

## Teacher rules shown in the interface
Every appointment explains itself in one sentence (`explain`), previews the effect of an unsaved edit ("If you save: students will see it as Unavailable"), and states what happened after saving. Editing never changes availability. Opening a closed slot needs confirmation, names the consequence for paper-taken slots, and is disabled (with the reason) for past slots. Closing a slot asks why, so "Taken on paper" is not silently turned into "Not available". The database does not record whether a slot was imported, so the interface says "Taken on paper" and "Unavailable" (what the data really holds), never "imported".

## Sound
Unchanged engine (`src/sound.js`): OFF by default, preference only in this browser, lazy audio context, played only from student actions (day, reserve, confirm, cancel, error), never from polling, never in teacher code or shared components, never required for booking.

## Honest limits
No custom font files are bundled (no network here): headings use the system's display face. No light theme. Sheets close with an animation only when closed by the user (X, Esc, backdrop, Close); when the app closes one itself (after Dismiss) it simply disappears. The visual review used Chromium at 320-1440 px and two landscape sizes; Safari and Firefox were not tested.


## v2.4.0 additions (Aurora look preserved)
Live badge (pill with a dot, motion off under reduced-motion), contextual bulk toolbar (portaled to `body`, fixed above the bottom nav on phones; floats bottom-right on desktop), server-preview dialog, activity timeline with tone-coloured icons, quiet version tag in the student footer and teacher sidebar. Bulk/roster controls use existing chips, buttons, pills and sheets.
