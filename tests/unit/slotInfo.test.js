import test from 'node:test'; import assert from 'node:assert/strict'
import {wallToUtcMs, previewAfter, classify, explain, saveOutcome, studentView, groupByDate, filterSlots, ACTION_LABEL} from '../../src/slotInfo.js'
import {buildIcs} from '../../src/ics.js'
const TZ = 'America/New_York', NOW = Date.parse('2026-10-14T16:00:00Z')
const slot = o => ({id: 'x', slot_date: '2026-10-15', period: 3, start_at: '2026-10-15T13:46:00Z', end_at: '2026-10-15T13:56:00Z', room: '407', available: true, reason: null, draft: false, held: false, booked: false, ...o})

test('wallToUtcMs: summer time (EDT, UTC-4), winter time (EST, UTC-5) and the day daylight saving ends', () => {
  assert.equal(new Date(wallToUtcMs('2026-10-15', '09:46', TZ)).toISOString(), '2026-10-15T13:46:00.000Z')
  assert.equal(new Date(wallToUtcMs('2026-11-02', '09:46', TZ)).toISOString(), '2026-11-02T14:46:00.000Z')
  assert.equal(new Date(wallToUtcMs('2026-11-01', '12:00', TZ)).toISOString(), '2026-11-01T17:00:00.000Z')
  assert.equal(new Date(wallToUtcMs('2026-10-15', '09:46', 'UTC')).toISOString(), '2026-10-15T09:46:00.000Z')
})
test('previewAfter changes date/period/time/room only; availability, reason and draft never change (mirrors admin_upsert_slot)', () => {
  const s = slot({available: false, reason: 'Taken on paper sign-up sheet'}), a = previewAfter(s, {date: '2026-10-16', period: '5', start: '11:25', end: '11:35', room: ' 422 '}, TZ)
  assert.deepEqual([a.slot_date, a.period, a.room, a.start_at], ['2026-10-16', 5, '422', '2026-10-16T15:25:00.000Z'])
  assert.deepEqual([a.available, a.reason, a.draft], [false, 'Taken on paper sign-up sheet', false])
  assert.equal(previewAfter(s, {date: '', period: '5', start: '', end: '', room: ''}, TZ), s)
})
test('classify covers every state, with Past as an overlay', () => {
  const k = o => classify(slot(o), NOW).kind
  assert.equal(k({}), 'open'); assert.equal(k({available: false, reason: 'Not available'}), 'closed'); assert.equal(k({available: false, reason: 'Taken on paper sign-up sheet'}), 'paper')
  assert.equal(k({booked: true}), 'booked'); assert.equal(k({held: true}), 'held'); assert.equal(k({draft: true}), 'draft'); assert.equal(k({available: false, reason: 'Closed by teacher'}), 'closed')
  assert.equal(classify(slot({start_at: '2026-10-13T13:46:00Z'}), NOW).past, true); assert.equal(classify(slot({}), NOW).past, false)
})
test('studentView mirrors list_slots: drafts and past slots are invisible, unavailable ones are visible but not bookable', () => {
  assert.deepEqual(studentView(slot({draft: true}), NOW), {visible: false, state: null, bookable: false})
  assert.equal(studentView(slot({start_at: '2026-10-14T15:59:00Z'}), NOW).visible, false)
  assert.deepEqual(studentView(slot({available: false}), NOW), {visible: true, state: 'unavailable', bookable: false})
  assert.deepEqual(studentView(slot({}), NOW), {visible: true, state: 'open', bookable: true}); assert.equal(studentView(slot({booked: true}), NOW).state, 'booked')
})
test('explain and saveOutcome never say "open" for something students cannot book', () => {
  assert.match(saveOutcome(slot({available: false, reason: 'Not available'}), NOW), /Unavailable/); assert.match(saveOutcome(slot({}), NOW), /Open within about 15 seconds/)
  assert.match(saveOutcome(slot({draft: true}), NOW), /draft/); assert.match(saveOutcome(slot({start_at: '2026-10-01T13:46:00Z'}), NOW), /passed/)
  assert.match(explain(slot({available: false, reason: 'Taken on paper sign-up sheet'}), NOW), /keeps it closed/); assert.match(explain(slot({booked: true}), NOW), /Booked through the website/)
})
test('every admin action name has a friendly label', () => { for (const a of ['upsert_slot', 'set_available', 'delete_slot', 'cancel', 'edit_booking', 'move', 'swap', 'copy', 'publish', 'lockdown', 'settings', 'range_available']) assert.ok(ACTION_LABEL[a], a) })
test('ics: valid calendar text in UTC with CRLF line endings and the room', () => {
  const t = buildIcs({id: 'abc', start_at: '2026-10-15T13:46:00Z', end_at: '2026-10-15T13:56:00Z', room: '407', period: 3}, new Date('2026-10-14T12:00:00Z'))
  assert.match(t, /^BEGIN:VCALENDAR\r\n/); assert.match(t, /DTSTART:20261015T134600Z\r\n/); assert.match(t, /DTEND:20261015T135600Z\r\n/); assert.match(t, /LOCATION:Room 407\r\n/); assert.match(t, /END:VCALENDAR\r\n$/)
})
