# Privacy (Aurora v2.4.3)
Students may be minors. **Get your school's approval before turning on the public roster.**

- **Default: availability only.** `public_roster` is OFF. While OFF, `list_roster()` returns zero rows: no other student's name can be retrieved from any API response.
- **Consent:** an optional, unchecked checkbox ("Allow my display name to appear on the class conference roster.") at booking. Booking works without it. A student can withdraw in My Booking at any time, even during Lockdown (`set_my_roster_consent`, own booking only).
- **Teacher override:** teachers can only **hide / stop hiding** (`admin_set_name_hidden`). Hide always wins over consent. No function lets a teacher set consent, so a teacher cannot publicly expose a name the student did not agree to.
- **A name is public only if:** roster ON **and** student consented **and** not hidden **and** the slot is upcoming and published.
- **Enforced in the database.** `list_roster()` selects the name only when allowed; hidden names never leave the database (nothing is merely concealed by CSS). Private rows return `display_name = null` and the app shows "Reserved — name hidden".
- **Never exposed to students:** assignments, emails, Auth ids, session ids, booking ids, teacher notes.
- **Existing bookings** become private by default (columns default false). **Paper sign-ups** have no booking row and stay anonymous.
- **Realtime** signals carry no personal data (REALTIME.md). Activity records store counts and flags, never names.
- Teachers see the full private roster in Bookings (consent / hidden / public status, search, filters, multi-select hide).

## Who can see the roster (read this before turning it on)
Aurora has no student log-in. Every visitor receives an anonymous session, and `list_roster()` answers any signed-in session. So **when the teacher switches the roster ON, the names of consenting students are visible to anyone who opens the site (and the site address is public), not only to classmates.** The checkbox wording says "class conference roster"; the technical audience is wider than that.
What limits the exposure: the switch is OFF by default; only students who tick the consent box appear; the teacher can hide any name; the roster returns nothing during Lockdown, for past or draft appointments, and to calls with no session; nothing but the display name, date, time, period and room is returned.
Ways to reduce it further (NOT implemented in v2.4.2 because they change behaviour; decide with your school): turn the roster on only for a short window; change the consent wording to say "anyone with the link"; or add a gate such as "only sessions that already hold a booking may list the roster" or a class code.

