# Manual regression checklist for conference-TEST (v2.4.3)
Use ONLY your TEST project. Use made-up student names. Do not turn the roster on for real students. No SQL is needed for this release.

**A. Phone toolbar (the fix).** Chrome: open the Teacher Panel, press Option+Cmd+I, click the phone icon, choose width 375 (then also 320 and 430).
1. Schedule, tap **Upcoming**. Scroll to the very bottom and tick the LAST appointment.
2. The page must NOT jump when you tick it.
3. Scroll down: the last appointment must come fully into view ABOVE the toolbar, with a visible gap, and above the bottom tabs.
4. The three buttons (Open selected, Close selected, Clear selection) all tappable; no sideways scrolling.
5. Tap **Clear selection**: the toolbar disappears and there is no big empty gap left at the bottom.
6. On a real iPhone if you can: tap the search box while rows are ticked; the toolbar should sit above the keyboard.
7. Repeat once at desktop width.

**B. Bulk safety.**
1. Tick 2 appointments, then change the Room filter so one disappears. The toolbar and count line must say "1 hidden by filters"; **Close selected** must mention it in the confirmation.
2. Click **Close all shown…**, leave the confirmation open, and (in another tab) book one of those appointments as a test student. Confirm in the first tab. Expected: the booked one stays booked; the message says the schedule changed in the meantime.
3. Try to open an appointment marked "Taken on paper" with bulk: it must be listed as protected and stay closed.

**C. Editing an imported appointment.** Pick ONE old imported appointment you do not mind changing (or use the TEST Oct 20 Period 3 Room TEST one first). Change the room, save, and check: the Schedule list, the student month calendar and the student list view all show the new room within a few seconds with no refresh. Then change the date to another day and check it moves to the right day on both sides and does not appear twice. If the appointment was "Taken on paper", confirm it still says so afterwards. Put the appointment back exactly as it was.

**D. Booked-slot warning.** Open the editor for a slot with a TEST booking; change the room. A warning about the online booking must appear before you save. Do not save, or restore it.

**E. Quick re-check that nothing regressed:** Live badge shows Live; teacher close/reopen reaches the student page; student booking and cancel reach the Teacher Panel; roster still OFF by default; Recent activity readable.
