# Aurora v3 real-device test matrix

Use the **aurora-after-dark** build connected to **conference-TEST**. Do not use the production project for destructive or race testing.

## Student booking race path

For every device/orientation below, verify:

- No horizontal scrolling.
- Top bar and bottom navigation stay reachable.
- Calendar opens immediately without a giant explanatory section.
- Open dates are visually dominant; full/unavailable dates are subdued.
- "Next open" starts a hold on the earliest open appointment.
- Name and assignment remain filled after refresh on the same device.
- Clicking a day with openings shows open times first.
- Unavailable/taken times stay hidden until "Show unavailable/taken" is pressed.
- If another session takes the same slot first, the losing session shows up to three alternative open times.
- Hold timer, form fields and Confirm button all fit and remain usable with the on-screen keyboard.
- Rotating the device while a sheet is open does not create sideways overflow or hide the close/confirm controls.
- Student changelog opens from the version footer.

## Teacher path

- Overview, Schedule, Bookings, Settings and Lockdown fit with no sideways scrolling.
- Rush Mode remains readable and updates as holds/bookings change.
- "Publish & open day" shows a confirmation and never changes paper-taken, booked or past appointments.
- Bulk toolbar never covers the final schedule row.
- Editors/sheets remain scrollable with the keyboard open.
- Dropdown arrows, radios, checkboxes and action buttons stay aligned.

## Required viewport/device coverage

| Device class | Portrait | Landscape |
|---|---|---|
| Small iPhone / SE-class | yes | **yes — priority** |
| Current iPhone | yes | **yes — priority** |
| Android phone | yes | **yes — priority** |
| iPad / tablet | yes | yes |
| Chromebook ~1366x768 | n/a | yes |
| MacBook / laptop | n/a | yes |
| Large desktop 1440+ | n/a | yes |

## Browser coverage

At minimum:
- iOS Safari on a real iPhone
- Chrome on Android or Chromebook
- Chrome on macOS
- Safari on macOS

## Rotation torture test

On a phone:
1. Open Calendar in portrait.
2. Rotate to landscape.
3. Tap an open day.
4. Start a hold.
5. Open the keyboard in the Name field.
6. Rotate back to portrait.
7. Rotate to landscape again.
8. Confirm that there is no horizontal overflow, no hidden Confirm button, and the timer/sheet remains usable.

## Concurrency test

Use one disposable future OPEN slot in **conference-TEST** and run:

```bash
export VITE_SUPABASE_URL="YOUR_TEST_URL"
export VITE_SUPABASE_ANON_KEY="YOUR_TEST_ANON_KEY"
export STRESS_SLOT_ID="UUID_OF_A_DISPOSABLE_OPEN_TEST_SLOT"
export STRESS_CONFIRM="I_AM_USING_CONFERENCE_TEST"
export STRESS_CLIENTS=100
npm run test:stress
```

Expected result: exactly one student hold wins; every other request is rejected; the slot reports Held during the winning hold; releasing that hold makes the slot Open again.

The stress script intentionally does **not** create a booking and must never be pointed at production.
