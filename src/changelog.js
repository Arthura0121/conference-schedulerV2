// Local release notes shown in "What's New". Newest first. The first entry MUST match package.json (tests enforce it). Keep to what is really in the release.
export const CHANGELOG = [
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
