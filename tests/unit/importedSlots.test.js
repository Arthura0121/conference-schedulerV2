// Regression tests for the "I edited an old Google-Doc appointment but it does not show on the student calendar" report.
// HONEST SCOPE: the database rules are re-implemented below as a small JS MODEL (a fake backend), and the model is pinned to the
// real SQL by the "model matches the SQL text" tests. Nothing here executes PostgreSQL. See TESTING.md for the real conference-TEST check.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'
import {classify, studentView, explain, saveOutcome, closeReason, schoolToday, addDays, rangePreset, filterSlots, statusCounts, groupByDate, PAPER_MARK} from '../../src/slotInfo.js'
const rd = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8')
const seed = rd('../../supabase/seed.sql'), sql = rd('../../supabase/migrations/001_schema.sql')
const TZ = 'America/New_York', NOW = Date.parse('2026-10-14T16:00:00Z')   // Wed 10/14 12:00 ET (today in the project)

// ---- rebuild the 180 imported slots exactly as seed.sql does ----
const tpl = [...seed.matchAll(/\((\d),(\d),'(\d\d:\d\d)','(\d\d:\d\d)','(\w+)'\)/g)].map(m => ({period: +m[1], n: +m[2], st: m[3], en: m[4], room: m[5]}))
const grid = [...seed.matchAll(/\('(\d{4}-\d\d-\d\d)',(\d),'([NPO]{3})'\)/g)].map(m => ({d: m[1], period: +m[2], code: m[3]}))
const toUtc = (d, hm) => new Date(`${d}T${hm}:00-04:00`).toISOString()      // all seed dates are inside EDT (UTC-4)
let nextId = 0
function importedSlots() {
  return grid.flatMap(g => [...g.code].map((c, i) => {
    const t = tpl.find(x => x.period === g.period && x.n === i + 1)
    const room = g.period === 7 && g.d < '2026-10-05' ? '422' : t.room
    return {id: 'imp' + (nextId++), slot_date: g.d, period: g.period, start_at: toUtc(g.d, t.st), end_at: toUtc(g.d, t.en), room,
      available: c === 'O', reason: c === 'N' ? 'Not available' : c === 'P' ? PAPER_MARK : null, draft: false}
  }))
}

// ---- the server model ----
function makeServer(slots) {
  const db = {slots: slots.map(s => ({...s})), bookings: [], holds: []}
  const flags = s => ({...s, booked: db.bookings.some(b => b.slot_id === s.id), held: db.holds.some(h => h.slot_id === s.id && h.expires > NOW)})
  return {
    db,
    // admin_upsert_slot (update branch: ONLY date, period, start, end, room change)
    upsert(id, {date, period, start, end, room}) {
      const a = toUtc(date, start), b = toUtc(date, end)
      if (b <= a) throw new Error('invalid_time')
      if (db.slots.some(x => x.room === room && x.id !== id && x.start_at < b && a < x.end_at)) throw new Error('conflict')
      if (id == null) { const s = {id: 'new' + (nextId++), slot_date: date, period, start_at: a, end_at: b, room, available: true, reason: null, draft: false}; db.slots.push(s); return s.id }
      const s = db.slots.find(x => x.id === id); if (!s) throw new Error('unavailable')
      Object.assign(s, {slot_date: date, period, start_at: a, end_at: b, room}); return id
    },
    // admin_set_available
    setAvailable(id, avail, reason) {
      const s = db.slots.find(x => x.id === id); if (!s) throw new Error('unavailable')
      if (!avail && db.bookings.some(b => b.slot_id === id)) throw new Error('has_booking')
      s.available = avail; s.reason = avail ? null : (String(reason || '').trim() || 'Not available')
    },
    // admin_slots(p_from,p_to): by slot_date, everything including past, drafts and unavailable
    adminSlots: (from, to) => db.slots.filter(s => s.slot_date >= from && s.slot_date <= to).map(flags),
    // list_slots: start_at > now() and not draft; state per the CASE expression
    listSlots: () => db.slots.filter(s => Date.parse(s.start_at) > NOW && !s.draft).map(s => {const f = flags(s); return {...s, state: !f.available ? 'unavailable' : f.booked ? 'booked' : f.held ? 'held' : 'open'}}),
    // hold_slot: order of checks as in the SQL
    hold(id) {
      const s = db.slots.find(x => x.id === id)
      if (!s || !s.available || s.draft) throw new Error('unavailable')
      if (Date.parse(s.start_at) <= NOW) throw new Error('past')
      return true
    }
  }
}
const edit = (srv, s, patch) => srv.upsert(s.id, {date: s.slot_date, period: s.period, start: '10:00', end: '10:10', room: s.room, ...patch})
const fresh = () => makeServer(importedSlots())
const future = (srv, code) => srv.adminSlots('2026-09-01', '2026-12-31').filter(s => Date.parse(s.start_at) > NOW && (code === 'N' ? s.reason === 'Not available' : s.reason === PAPER_MARK))[0]

// ---- the model is pinned to the SQL text ----
test('model matches the SQL: admin_upsert_slot UPDATE changes only date/period/start/end/room (never available, reason or draft)', () => {
  const fn = sql.match(/create function admin_upsert_slot[\s\S]*?\$\$;?\s*(?=\ncreate function)/)[0]
  const upd = fn.match(/update slots set ([^;]*?) where id=p_id/)[1]
  assert.equal(upd, 'slot_date=p_date,period=p_period,start_at=a,end_at=b,room=btrim(p_room)')
  assert.ok(!/available|reason|draft/.test(upd))
})
test('model matches the SQL: new slots default to available=true, draft=false (so they appear open)', () => {
  assert.match(sql, /available boolean not null default true/); assert.match(sql, /draft boolean not null default false/)
  assert.match(sql.match(/insert into slots\(slot_date,period,start_at,end_at,room\) values/)[0], /insert into slots\(slot_date,period,start_at,end_at,room\)/)
})
test('model matches the SQL: list_slots hides past and draft slots and reports unavailable ones as state unavailable', () => {
  const fn = sql.match(/create function list_slots[\s\S]*?\$\$;?\s*(?=\ncreate function)/)[0]
  assert.match(fn, /where s\.start_at>now\(\) and not s\.draft/); assert.match(fn, /when not s\.available then 'unavailable'/)
})
test('model matches the SQL: hold_slot rejects unavailable, draft and past slots (server rules we must never weaken)', () => {
  const fn = sql.match(/create function hold_slot[\s\S]*?\$\$;?\s*(?=\ncreate function)/)[0]
  assert.match(fn, /not s\.available or s\.draft then raise exception 'unavailable'/); assert.match(fn, /s\.start_at<=now\(\) then raise exception 'past'/)
})
test('model matches the SQL: admin_set_available clears the reason when opening and defaults it to "Not available" when closing', () => {
  assert.match(sql, /available=p_avail,reason=case when p_avail then null else coalesce\(nullif\(btrim\(p_reason\),''\),'Not available'\) end/)
})
test('model matches the SQL: admin_slots is keyed by slot_date and does not hide past, draft or unavailable slots', () => {
  const fn = sql.match(/create function admin_slots[\s\S]*?\$\$;?\s*(?=\ncreate function)/)[0]
  assert.match(fn, /where s\.slot_date between p_from and p_to/); assert.ok(!/start_at>now|available=true|s\.available\s+and/.test(fn.split('where')[1]))
})

// ---- the seed ----
test('imported seed = 180 slots: 70 Not available, 109 paper, 1 open; only imported slots carry a reason', () => {
  const s = importedSlots(); assert.equal(s.length, 180)
  assert.equal(s.filter(x => x.reason === 'Not available').length, 70); assert.equal(s.filter(x => x.reason === PAPER_MARK).length, 109); assert.equal(s.filter(x => x.available).length, 1)
})
test('REPORT REPRODUCED: right now students see ZERO open appointments from the imported sheet (all future ones are unavailable, the rest are past)', () => {
  const srv = fresh(), list = srv.listSlots()
  assert.ok(list.length > 0 && list.length <= 48, 'only future imported slots are listed: ' + list.length)
  assert.ok(list.every(s => s.state === 'unavailable')); assert.equal(list.filter(s => s.state === 'open').length, 0)
  assert.ok(srv.adminSlots('2026-01-01', '2026-12-31').length === 180, 'the teacher side still holds all 180')
})

// ---- editing imported slots ----
test('editing room, time, period or date of an imported slot is persisted and does NOT make it available (expected behavior)', () => {
  for (const code of ['N', 'P']) {
    const srv = fresh(), s = future(srv, code), before = {available: s.available, reason: s.reason}
    edit(srv, s, {room: 'ZZ9', start: '10:20', end: '10:30', period: 5, date: '2026-10-16'})
    const after = srv.adminSlots('2026-10-16', '2026-10-16').find(x => x.id === s.id)
    assert.deepEqual([after.room, after.period, after.slot_date], ['ZZ9', 5, '2026-10-16'])
    assert.equal(after.start_at, toUtc('2026-10-16', '10:20')); assert.equal(after.available, before.available); assert.equal(after.reason, before.reason)
    const seen = srv.listSlots().find(x => x.id === s.id)
    assert.ok(seen, 'a FUTURE edited slot is still listed for students'); assert.equal(seen.state, 'unavailable'); assert.equal(seen.room, 'ZZ9')
  }
})
test('moving an imported slot to a past date saves fine but removes it from the student list (expected: list_slots hides the past)', () => {
  const srv = fresh(), s = future(srv, 'P'); edit(srv, s, {date: '2026-10-01', start: '07:00', end: '07:10'})   // a free time: a clash would be (correctly) refused as 'conflict'
  assert.ok(!srv.listSlots().some(x => x.id === s.id)); assert.ok(srv.adminSlots('2026-10-01', '2026-10-01').some(x => x.id === s.id))
  const a = srv.adminSlots('2026-10-01', '2026-10-01').find(x => x.id === s.id)
  assert.equal(classify(a, NOW).past, true); assert.match(explain(a, NOW), /already passed/); assert.match(saveOutcome(a, NOW), /passed.*not see/)
})
test('a slot the teacher intentionally opens (future) appears as Open and bookable; the paper marker is cleared by the server', () => {
  const srv = fresh(), s = future(srv, 'P'); srv.setAvailable(s.id, true, null)
  const seen = srv.listSlots().find(x => x.id === s.id); assert.equal(seen.state, 'open'); assert.equal(seen.reason, null)
  assert.equal(srv.hold(s.id), true)
})
test('a PAST slot can be marked Open on the server, yet students never see it and booking it fails with "past" (the misleading state the UI now explains)', () => {
  const srv = fresh(), past = srv.adminSlots('2026-09-30', '2026-09-30').find(x => x.available)   // the single original open slot
  assert.ok(past && Date.parse(past.start_at) < NOW)
  const p2 = srv.adminSlots('2026-09-28', '2026-09-28')[0]; srv.setAvailable(p2.id, true, null)
  assert.ok(!srv.listSlots().some(x => x.id === p2.id)); assert.throws(() => srv.hold(p2.id), /past/)
  const a = srv.adminSlots('2026-09-28', '2026-09-28').find(x => x.id === p2.id)
  assert.equal(classify(a, NOW).label, 'Open'); assert.equal(classify(a, NOW).past, true); assert.equal(studentView(a, NOW).visible, false)
  assert.match(explain(a, NOW), /marked Open, but the server will never let anyone book a past time/)
})
test('newly created slots appear Open, can be edited, and stay Open (the behavior the report compared against)', () => {
  const srv = fresh(), id = srv.upsert(null, {date: '2026-10-20', period: 3, start: '09:46', end: '09:56', room: 'T1'})
  assert.equal(srv.listSlots().find(x => x.id === id).state, 'open')
  srv.upsert(id, {date: '2026-10-21', period: 5, start: '11:25', end: '11:35', room: 'T2'})
  const s = srv.listSlots().find(x => x.id === id); assert.deepEqual([s.state, s.room, s.slot_date], ['open', 'T2', '2026-10-21'])
})
test('conflicts and bad times are refused, so an "accepted" edit really was applied', () => {
  const srv = fresh(), a = future(srv, 'N'), b = future(srv, 'P')
  assert.throws(() => srv.upsert(a.id, {date: a.slot_date, period: a.period, start: '10:00', end: '09:00', room: a.room}), /invalid_time/)
  const clash = srv.adminSlots(b.slot_date, b.slot_date).find(x => x.id !== a.id && x.room !== a.room)
  assert.throws(() => srv.upsert(a.id, {date: clash.slot_date, period: a.period, start: new Date(clash.start_at).toLocaleTimeString('en-GB', {timeZone: TZ, hour12: false}).slice(0, 5), end: new Date(clash.end_at).toLocaleTimeString('en-GB', {timeZone: TZ, hour12: false}).slice(0, 5), room: clash.room}), /conflict/)
})

// ---- paper marker ----
test('closing a slot again with no reason turns "Taken on paper" into plain "Not available" on the server; closeReason() prevents that when the teacher says it was paper', () => {
  const srv = fresh(), s = future(srv, 'P'); srv.setAvailable(s.id, true, null); srv.setAvailable(s.id, false, null)
  assert.equal(srv.adminSlots(s.slot_date, s.slot_date).find(x => x.id === s.id).reason, 'Not available')   // the information loss
  srv.setAvailable(s.id, true, null); srv.setAvailable(s.id, false, closeReason('paper'))
  assert.equal(classify(srv.adminSlots(s.slot_date, s.slot_date).find(x => x.id === s.id), NOW).kind, 'paper')
  assert.equal(closeReason('other', '  Room in use  '), 'Room in use'); assert.equal(closeReason('other', ''), 'Not available')
})

// ---- visibility of the imported rows to the teacher ----
test('the OLD default range (today-14 by UTC) hid imported 9/28 and 9/29; the new default shows every imported date', () => {
  const oldFrom = new Date(NOW - 14 * 864e5).toISOString().slice(0, 10)
  assert.ok('2026-09-28' < oldFrom && '2026-09-29' < oldFrom, 'old range started ' + oldFrom)
  const r = rangePreset('all', TZ, NOW), srv = fresh(), n = srv.adminSlots(r.from, r.to).length
  assert.equal(n, 180)
})
test('timezone: at 9:30 pm New York time the OLD UTC-based "today" was already tomorrow; schoolToday is correct', () => {
  const lateEvening = Date.parse('2026-10-14T01:30:00Z')   // 9:30 pm Tue 10/13 in New York
  assert.equal(new Date(lateEvening).toISOString().slice(0, 10), '2026-10-14'); assert.equal(schoolToday(TZ, lateEvening), '2026-10-13')
  assert.equal(addDays('2026-10-31', 1), '2026-11-01'); assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})
test('filters, counts and grouping cover paper, unavailable, past and search over all 180 imported slots', () => {
  const all = fresh().adminSlots('2026-01-01', '2026-12-31'), c = statusCounts(all, NOW)
  assert.equal(c.all, 180); assert.equal(c.paper + c.closed + c.open, 180); assert.equal(c.paper, 109); assert.equal(c.closed, 70); assert.equal(c.open, 1)
  assert.ok(c.past > 100 && c.past < 180)
  assert.equal(filterSlots(all, {status: 'paper'}, NOW).length, 109); assert.equal(filterSlots(all, {period: 9, status: 'closed'}, NOW).every(s => s.period === 9), true)
  assert.equal(filterSlots(all, {q: '436b'}, NOW).every(s => s.room === '436B'), true)
  const g = groupByDate(filterSlots(all, {}, NOW)); assert.equal(g.length, 15); assert.equal(g[0].periods.length, 4)
})
