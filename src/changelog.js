// Local release notes shown in "What's New". Newest first. The first entry MUST match package.json (tests enforce it). Keep to what is really in the release.
export const CHANGELOG = [
  {version: '4.1.0', date: '2026-10-24', title: 'Live Visitors & Mobile Refinements', items: [
    'A live, approximate visitor count is available on student pages, lock screens, teacher sign-in, all teacher tabs, loading and connection states. Browsers with multiple same-origin tabs are grouped, with no student names or appointment data in Presence.',
    'Student and teacher phone layouts receive clearer compact headers, easier-to-reach controls, larger touch targets, consistent navigation, a swipeable period selector, improved calendar actions and more comfortable booking forms.',
    'Teacher scheduling now restores previously saved lockdown times correctly and checks invalid or backwards date ranges before sending them.',
    'Cross-screen desktop, phone, tablet and landscape regression tests were extended, alongside unit tests for visitor counts and lockdown dates.',
    'Frontend-only release candidate. No SQL migrations or production database changes. Test realtime visitor counts with two browsers against TEST before deployment.']},

  {version: '4.0.0', date: '2026-10-18', title: 'The Complete Conference Experience', items: [
    'A cohesive second-generation redesign across student, teacher, sign-in, locked, loading, error, booking, and confirmation screens, with Aurora, Fall, Halloween and Winter each using their own seasonal atmosphere and interface accents.',
    'Mobile navigation and scrolling have been rebuilt: students can reach Calendar, Times, Sound and Teacher login, while staff can reach all five sections, Student view and Sign out. The desktop rails now keep their controls fitted and reachable even on short screens.',
    'Students get a clearer, larger calendar month header, organized navigation and a compact grid of period filters; the teacher dashboard, scheduling tools and booking roster share consistent responsive controls.',
    'One Live connection indicator per view, safer booking/bulk confirmations, consistent dialogs and notifications, and a teacher-side HTML export/print roster for authorized staff.',
    'Removed the obsolete ribbon-shaped E logo and legacy gradients. English Conferences now uses a simple typography-led wordmark across loading, sign-in and other entry screens.',
    'Teacher slot editors validate required fields before saving. Automated unit, build and Chromium desktop/phone tests cover the four themes and major student and teacher workflows.',
    'Frontend-only release on aurora-after-dark. No new SQL migration, production deployment or verification against a live Supabase database is included.']},
  {version: '3.0.0', date: '2026-10-17', title: 'Aurora After Dark', items: [
    'Massive visual upgrade across the student and teacher experiences with the After Dark animated aurora-and-starfield system.',
    'The student calendar is now a compact race-ready booking surface with a one-tap Next open action, stronger open-day emphasis, live availability status, open-only time lists by default, and an optional period filter that also controls Calendar, Times, Next open, and race-recovery suggestions.',
    'Student names are remembered only for the current browser session to speed up retries, while assignment titles are never saved and always start blank. If another student wins a slot first, Aurora immediately offers up to three other live openings.',
    'Teacher pages now share one consistent layout system, include a live Rush Mode dashboard, can Publish & open an entire day safely, and include teacher-managed Aurora, Fall, Halloween, and Winter site themes that update students live; seasonal themes are full visual worlds with their own animated scenes and UI treatments rather than Aurora recolors; Winter now includes a flying Santa sleigh with four reindeer and gifts plus a glowing village, wreaths and extra festive lights, while Fall and Halloween gain additional scene details too.',
    'Phone portrait and landscape layouts were rebuilt, including short-screen dialogs and rotation behavior; dropdowns, radios, controls, and sidebar alignment were standardized across the app.',
    'A TEST-only concurrency harness can race up to 200 separate student sessions for one disposable slot, plus a real-device portrait/landscape verification matrix.',
    'No production deployment: this release is still on the aurora-after-dark development branch.']},
  {version: '2.4.3', date: '2026-10-17', title: 'Phone toolbar fix, safer bulk confirmation', items: [
    'On phones, the floating bulk toolbar no longer covers the last appointment. The page now leaves exactly the room the toolbar and bottom tabs need, and only while something is selected.',
    'The bulk confirmation acts only on the appointments you previewed, even if the schedule updates behind it, and tells you plainly if something changed in the meantime.',
    'Selected appointments that a filter is hiding are now announced, so you always know what a bulk action will include.',
    'The appointment editor warns you before you change the date, time or room of an appointment that already has an online booking.',
    'No database change.']},
  {version: '2.4.2', date: '2026-10-16', title: 'Database check fixes', items: [
    'The database check script was corrected so it reads its results reliably and no longer claims protections it cannot guarantee.',
    'The update script now stops before changing anything if a required Realtime security setting is missing.',
    'No change to how the site looks or behaves.']},
  {version: '2.4.1', date: '2026-10-15', title: 'Database safety review', items: [
    'Safety review of the live-updates, bulk open/close and roster database code before it is installed. Several protections were tightened; nothing was removed.',
    'Bulk open/close now rejects incomplete requests instead of guessing, and it cannot deadlock with other teacher actions.',
    'Database checks can now be run safely before and after the update.']},
  {version: '2.4.0', date: '2026-10-15', title: 'Live updates, bulk open/close, optional roster', items: [
    'Live scheduling updates over Supabase Realtime (private Broadcast channels). Polling remains only as a fallback and a slow safety check.',
    'Bulk appointment management: select many appointments, then open or close them with a server-side preview. Paper-taken, booked, past and draft appointments are protected.',
    'Optional class roster (off by default). Students choose whether their display name may appear; you can hide any name. Needs school approval before use.',
    'Recent activity is now a readable timeline that understands older, technical entries too.',
    'Version label for students and teachers, an About panel, and this What\u2019s New list.']},
  {version: '2.3.0', date: '2026-10-13', title: 'Aurora redesign', items: [
    'New Aurora look for students and teachers, with desktop, tablet and phone layouts.',
    'Clearer editing of appointments imported from the paper sheets, with a preview of what students will see.',
    'In-app dialogs and notifications replace browser pop-ups.']}
]
export const latestRelease = () => CHANGELOG[0]
