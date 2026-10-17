import {classifyForBulk} from '/bulk.js'
// Fake Supabase client for the sandbox browser harness. It mimics the RPC results of the real functions; it is NOT Supabase.
// It follows the same rules as the SQL (see tests/unit/importedSlots.test.js): list_slots hides past + draft, upsert never touches availability.
const day = '2026-10-20', PAPER = 'Taken on paper sign-up sheet', EDT = '-04:00'
const at = (d, hm) => new Date(`${d}T${hm}:00${EDT}`).toISOString()
const db = {slots: [{id: 's1', slot_date: day, period: 3, start_at: day + 'T13:46:00Z', end_at: day + 'T13:56:00Z', room: 'T1', available: true, draft: false, reason: null}], books: [], events: [],
  cfg: {public_roster: false, tz: 'America/New_York', locked: false, lock_message: "We'll Be Back Soon!", policy: '1. Do not skip a class for a conference.\n2. Choose one piece of writing to revise and reread it first.\n3. If you have lunch during a free period, book then.\n4. Cancel at least 24 hours ahead (the site enforces this).\n5. One conference at a time.', auto_lock_on_edit: false, lock_from: null, lock_until: null, edit_lock_until: null}}
window.__db = db; window.__calls = []; window.__net = {fail: false}; let admin = false, n = 0
// A realistic imported sheet: N / P rows for several days (mostly closed), like seed.sql.
window.__imported = () => {
  const T = [[3, '09:46', '09:56', '407'], [3, '10:01', '10:11', '407'], [3, '10:15', '10:25', '407'], [5, '11:25', '11:35', '422'], [5, '11:40', '11:50', '422'], [5, '11:55', '12:05', '422'], [7, '13:00', '13:10', '436B'], [7, '13:15', '13:25', '436B'], [7, '13:30', '13:40', '436B'], [9, '14:35', '14:45', '422'], [9, '14:50', '15:00', '422'], [9, '15:05', '15:15', '422']]
  const days = ['2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']
  days.forEach((d, di) => T.forEach(([p, a, b, r], i) => db.slots.push({id: `i${di}-${i}`, slot_date: d, period: p, start_at: at(d, a), end_at: at(d, b), room: r, available: false, draft: false, reason: (i + di) % 3 === 0 ? 'Not available' : PAPER})))
}
const bookedOf = id => db.books.find(b => b.slot_id === id)
const nowMs = () => Date.now(), isPast = s => Date.parse(s.start_at) <= nowMs()
export const configured = true
// ---- v2.4.0 fake realtime: a controllable channel. window.__rt.status(s) simulates subscribe states; window.__rt.signal() simulates a database signal. Not Supabase. ----
window.__rt = {channels: [], removed: 0}
const mkChannel = (topic, opts) => {const c = {topic, opts, handlers: [], on(t, f, h) {this.handlers.push([t, f, h]); return this}, subscribe(cb) {this.cb = cb; return this}}; window.__rt.channels.push(c); return c}
window.__rt.status = st => window.__rt.channels.filter(c => !c.dead).forEach(c => c.cb && c.cb(st))
window.__rt.signal = (kind = 'slots') => window.__rt.channels.filter(c => !c.dead).forEach(c => c.handlers.forEach(([, , h]) => h({payload: {v: 1, kind}})))
export const ensureSession = async () => {}
export const sb = {realtime: {setAuth: async () => {}}, channel: mkChannel, removeChannel: c => {c.dead = true; window.__rt.removed++}, auth: {getSession: async () => ({data: {session: {}}}), signInAnonymously: async () => ({error: null}), signInWithPassword: async () => {admin = true; return {error: null}}, signOut: async () => {admin = false}}}
const need = () => {if (!admin) throw Object.assign(new Error('forbidden'), {code: 'P0001'})}
const log = (a, d = '') => db.events.unshift({happened_at: new Date(nowMs()).toISOString(), action: a, detail: d})
export const call = async (fn, a = {}) => {
  window.__calls.push(fn); if (window.__net.fail) throw new TypeError('Failed to fetch')
  switch (fn) {
    case 'public_state': return {locked: db.cfg.locked, message: db.cfg.lock_message, policy: db.cfg.policy, tz: db.cfg.tz, roster_on: !!db.cfg.public_roster, next_change: null}
    case 'list_slots': return db.slots.filter(s => !s.draft && !isPast(s)).map(s => ({id: s.id, slot_date: s.slot_date, period: s.period, start_at: s.start_at, end_at: s.end_at, room: s.room, state: !s.available ? 'unavailable' : bookedOf(s.id) ? 'booked' : 'open', mine: !!(db.mine && db.mine.slot_id === s.id)}))
    case 'my_booking': return db.mine ? [db.mine] : []
    case 'hold_slot': {const s = db.slots.find(x => x.id === a.p_slot); if (!s || !s.available || s.draft) throw new Error('unavailable'); if (isPast(s)) throw new Error('past'); return new Date(nowMs() + 60000).toISOString()}
    case 'confirm_booking': {const s = db.slots.find(x => x.id === a.p_slot); db.books.push({slot_id: s.id, student_name: a.p_name, assignment: a.p_assignment}); db.mine = {slot_id: s.id, start_at: s.start_at, room: s.room, period: s.period, student_name: a.p_name, assignment: a.p_assignment}; return null}
    case 'cancel_my_booking': db.books = db.books.filter(b => !db.mine || b.slot_id !== db.mine.slot_id); db.mine = null; return null
    case 'release_my_hold': return null
    case 'admin_check': return admin
    case 'admin_stats': {need(); const up = db.slots.filter(s => !isPast(s)), free = s => s.available && !s.draft && !bookedOf(s.id)
      return {total: db.slots.length, booked: db.books.length, held: 0, unavailable: db.slots.filter(s => !s.available && !bookedOf(s.id)).length, open: db.slots.filter(free).length, upcoming_booked: up.filter(s => bookedOf(s.id)).length, upcoming_open: up.filter(free).length, drafts: db.slots.filter(s => s.draft).length, bookings_7d: db.books.length}}
    case 'admin_events': need(); return db.events.slice(0, 15)
    case 'admin_activity': need(); return db.events.slice(0, 30).map((e, i) => ({id: 100 - i, meta: e.meta || null, slot_a: null, slot_b: null, ...e}))
    case 'list_roster': return !db.cfg.public_roster ? [] : db.books.filter(b => !b.hidden).map(b => {const s = db.slots.find(x => x.id === b.slot_id); return {slot_date: s.slot_date, period: s.period, start_at: s.start_at, room: s.room, display_name: b.consent && !b.hidden ? b.student_name : null, name_hidden: !(b.consent && !b.hidden)}})
    case 'set_my_roster_consent': {const b = db.mine && bookedOf(db.mine.slot_id); b.consent = a.p_show; db.mine.roster_consent = a.p_show; return null}
    case 'admin_set_roster_public': need(); db.cfg.public_roster = a.p_on; log('roster_public', String(a.p_on)); return null
    case 'admin_set_name_hidden': {need(); let c = 0, nc = 0; for (const b of db.books) if (a.p_slots.includes(b.slot_id)) {if (!!b.hidden !== a.p_hidden) c++; b.hidden = a.p_hidden; if (!a.p_hidden && !b.consent) nc++} log('roster_hide', a.p_hidden + ' ' + c); return {changed: c, no_consent: nc}}
    case 'admin_bulk_set_available': {need(); const cls = (s) => classifyForBulk({...s, booked: !!bookedOf(s.id)}, a.p_avail, a.p_include_other); const sl = a.p_ids.map(i => db.slots.find(s => s.id === i)).filter(Boolean)
      const r = {dry_run: a.p_dry_run, requested: a.p_ids.length, missing: a.p_ids.length - sl.length, eligible: 0, already_open: 0, already_closed: 0, paper: 0, booked: 0, past: 0, draft: 0, needs_opt_in: 0, held_released: 0}
      const ok = []; sl.forEach(s => {const c = cls(s); r[c]++; if (c === 'eligible') ok.push(s)})
      if (a.p_dry_run) return r
      ok.forEach(s => {s.available = a.p_avail; s.reason = a.p_avail ? null : 'Closed by teacher'}); log('bulk_available', (a.p_avail ? 'open ' : 'close ') + ok.length); db.events[0].meta = {action: a.p_avail ? 'open' : 'close', requested: r.requested, changed: ok.length, skipped: {paper: r.paper, booked: r.booked, past: r.past, draft: r.draft, already: r.already_open + r.already_closed, needs_opt_in: r.needs_opt_in, missing: r.missing}}
      return {...r, dry_run: false, changed: ok.length, holds_released: 0}}
    case 'admin_settings': need(); return {...db.cfg}
    case 'admin_slots': need(); return db.slots.filter(s => s.slot_date >= a.p_from && s.slot_date <= a.p_to).sort((x, y) => x.start_at.localeCompare(y.start_at)).map(s => ({...s, held: false, booked: !!bookedOf(s.id), student_name: bookedOf(s.id)?.student_name ?? null, assignment: bookedOf(s.id)?.assignment ?? null}))
    case 'admin_bookings': need(); return db.books.map(b => {const s = db.slots.find(x => x.id === b.slot_id); return {...b, start_at: s.start_at, room: s.room, period: s.period, slot_date: s.slot_date, dup: false, created_at: '2026-10-13T12:00:00Z'}})
    case 'admin_upsert_slot': {need(); const st = at(a.p_date, a.p_start), en = at(a.p_date, a.p_end); if (en <= st) throw new Error('invalid_time')
      if (db.slots.some(x => x.room === a.p_room.trim() && x.id !== a.p_id && x.start_at < en && st < x.end_at)) throw new Error('conflict')
      if (a.p_id == null) db.slots.push({id: 'n' + (++n), slot_date: a.p_date, period: a.p_period, start_at: st, end_at: en, room: a.p_room.trim(), available: true, draft: false, reason: null})
      else Object.assign(db.slots.find(x => x.id === a.p_id), {slot_date: a.p_date, period: a.p_period, start_at: st, end_at: en, room: a.p_room.trim()})   // never touches available / reason / draft
      log('upsert_slot'); return null}
    case 'admin_set_available': {need(); const s = db.slots.find(x => x.id === a.p_slot); s.available = a.p_avail; s.reason = a.p_avail ? null : ((a.p_reason || '').trim() || 'Not available'); log('set_available'); return null}
    case 'admin_delete_slot': need(); db.slots = db.slots.filter(x => x.id !== a.p_id); log('delete_slot'); return null
    case 'admin_edit_booking': {need(); const b = bookedOf(a.p_slot); b.student_name = a.p_name; b.assignment = a.p_assignment; log('edit_booking'); return null}
    case 'admin_cancel': need(); db.books = db.books.filter(b => b.slot_id !== a.p_slot); log('cancel'); return null
    case 'admin_set_lockdown': need(); Object.assign(db.cfg, {locked: a.p_locked, lock_message: a.p_msg || db.cfg.lock_message, lock_from: a.p_from, lock_until: a.p_until}); log('lockdown'); return null
    case 'admin_end_edit': need(); db.cfg.edit_lock_until = null; return null
    default: throw new Error('fake backend: unexpected ' + fn)
  }
}
