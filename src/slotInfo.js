// Pure slot logic for the teacher and student screens. No React, no network. Unit-tested in tests/unit/slotInfo.test.js.
// These helpers MIRROR (never replace) the rules the database enforces, so the interface can explain them:
//   list_slots : students only ever see slots with start_at > now() that are not drafts.
//   hold_slot  : refuses unavailable / draft slots ('unavailable') and slots whose start has passed ('past').
import {ymd} from './lib.js'

export const PAPER_MARK = 'Taken on paper sign-up sheet'
export const DEFAULT_CLOSED_REASON = 'Not available'
const PAPER_RE = /^taken on paper/i

export const isPaper = s => !s.available && PAPER_RE.test(String(s.reason || ''))
export const isPast = (s, nowMs) => new Date(s.start_at).getTime() <= nowMs

/** What the teacher sees. `kind` is the main state; `past` is an overlay that can apply to any kind. */
export function classify(s, nowMs = Date.now()) {
  const past = isPast(s, nowMs)
  let kind
  if (s.draft) kind = 'draft'
  else if (s.booked) kind = 'booked'
  else if (s.held) kind = 'held'
  else if (!s.available) kind = isPaper(s) ? 'paper' : 'closed'
  else kind = 'open'
  return {kind, past, label: KIND_LABEL[kind], student: studentView(s, nowMs)}
}
export const KIND_LABEL = {open: 'Open', closed: 'Unavailable', paper: 'Taken on paper', booked: 'Booked online', held: 'Held now', draft: 'Draft'}
export const KIND_TONE = {open: 'mint', closed: 'slate', paper: 'amber', booked: 'violet', held: 'cyan', draft: 'peri'}

/** Exactly what a student's list_slots returns for this slot (or null when it is not returned at all). */
export function studentView(s, nowMs = Date.now()) {
  const visible = !s.draft && !isPast(s, nowMs)
  if (!visible) return {visible: false, state: null, bookable: false}
  const state = !s.available ? 'unavailable' : s.booked ? 'booked' : s.held ? 'held' : 'open'
  return {visible: true, state, bookable: state === 'open'}
}

/** One plain sentence telling the teacher what students experience for this slot right now. */
export function explain(s, nowMs = Date.now()) {
  const c = classify(s, nowMs), v = c.student
  if (s.draft) return c.past ? 'Draft and in the past. Students never see it.' : 'Draft: hidden from students until you publish it.'
  if (c.past) {
    const base = 'This time has already passed, so students cannot see or book it.'
    if (s.booked) return base + ' It keeps its online booking for your records.'
    if (s.available && !s.held) return base + ' It is marked Open, but the server will never let anyone book a past time.'
    return base + (c.kind === 'paper' ? ' (It was taken on a paper sheet.)' : '')
  }
  if (c.kind === 'booked') return 'Booked through the website. Students see it as Booked.'
  if (c.kind === 'held') return 'A student is booking this right now (15-second hold).'
  if (c.kind === 'paper') return 'Taken on the paper sign-up sheet. Students see it as Unavailable. Editing its time or room keeps it closed.'
  if (c.kind === 'closed') return 'Marked Not available. Students see it as Unavailable. Editing its time or room keeps it closed.'
  return v.bookable ? 'Open. Students can reserve it now (they see changes within about 15 seconds).' : ''
}

/** Message after a teacher action: what actually changed for students. Keeps "Done." from hiding the real state. */
export function saveOutcome(after, nowMs = Date.now(), verb = 'Saved') {
  const v = studentView(after, nowMs)
  if (after.draft) return `${verb}. This is a draft, so students cannot see it yet.`
  if (isPast(after, nowMs)) return `${verb}. That time has passed, so students will not see it.`
  if (v.state === 'unavailable') return `${verb}. Students will see it as Unavailable (it is still closed).`
  if (v.state === 'booked') return `${verb}. Students see it as Booked.`
  return `${verb}. Students will see it as Open within about 15 seconds.`
}

/** The reason text to send when closing a slot. Never lets "Taken on paper" silently become "Not available". */
export function closeReason(choice, custom = '') {
  if (choice === 'paper') return PAPER_MARK
  const t = String(custom || '').trim()
  return t || DEFAULT_CLOSED_REASON
}

// ---- dates (school time zone, never the browser's UTC clock) ----
export const schoolToday = (tz, nowMs = Date.now()) => ymd(new Date(nowMs).toISOString(), tz)
export function addDays(d, n) {
  const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}
/** Wide on purpose: imported sheet dates (weeks in the past) must be visible and editable by default. */
export function rangePreset(name, tz, nowMs = Date.now()) {
  const t = schoolToday(tz, nowMs)
  if (name === 'upcoming') return {from: t, to: addDays(t, 120)}
  if (name === 'past') return {from: addDays(t, -180), to: addDays(t, -1)}
  return {from: addDays(t, -180), to: addDays(t, 180)}   // 'all'
}

// ---- schedule filtering and grouping ----
export const STATUS_FILTERS = ['all', 'open', 'closed', 'paper', 'booked', 'draft', 'past']
export function matchesStatus(s, status, nowMs) {
  if (status === 'all') return true
  const c = classify(s, nowMs)
  if (status === 'past') return c.past
  if (status === 'booked') return c.kind === 'booked' || c.kind === 'held'
  return c.kind === status
}
export function filterSlots(slots, {q = '', status = 'all', period = 'all', room = 'all', from = '', to = ''} = {}, nowMs = Date.now()) {
  const needle = q.trim().toLowerCase()
  return slots.filter(s => {
    if (period !== 'all' && String(s.period) !== String(period)) return false
    if (room !== 'all' && s.room !== room) return false
    if (from && s.slot_date < from) return false
    if (to && s.slot_date > to) return false
    if (!matchesStatus(s, status, nowMs)) return false
    if (!needle) return true
    return [s.room, s.reason, s.student_name, s.assignment, s.slot_date, 'p' + s.period].join(' ').toLowerCase().includes(needle)
  })
}
export function statusCounts(slots, nowMs = Date.now()) {
  const out = Object.fromEntries(STATUS_FILTERS.map(k => [k, 0]))
  for (const s of slots) for (const k of STATUS_FILTERS) if (matchesStatus(s, k, nowMs)) out[k]++
  return out
}
export function groupByDate(slots) {
  const days = new Map()
  for (const s of slots) {
    if (!days.has(s.slot_date)) days.set(s.slot_date, new Map())
    const d = days.get(s.slot_date)
    if (!d.has(s.period)) d.set(s.period, [])
    d.get(s.period).push(s)
  }
  return [...days.entries()].map(([date, ps]) => ({date, periods: [...ps.entries()].map(([period, items]) => ({period, items}))}))
}

// ---- school-clock helpers (so the editor can preview the student view BEFORE saving) ----
function tzOffsetMs(utcMs, tz) {
  const p = new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    .formatToParts(new Date(utcMs)).reduce((a, x) => (a[x.type] = x.value, a), {})
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs
}
/** 'YYYY-MM-DD' + 'HH:MM' on the school wall clock -> UTC milliseconds (same meaning as SQL `(date + time) at time zone tz`). */
export function wallToUtcMs(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number), guess = Date.UTC(y, m - 1, d, hh, mm)
  let t = guess - tzOffsetMs(guess, tz); t = guess - tzOffsetMs(t, tz); return t
}
/** The slot as it WOULD be after saving the editor form (availability, reason, draft are untouched, exactly like admin_upsert_slot). */
export function previewAfter(s, f, tz) {
  const ok = /^\d{4}-\d\d-\d\d$/.test(f.date) && /^\d\d:\d\d$/.test(f.start) && /^\d\d:\d\d$/.test(f.end)
  if (!ok) return s
  return {...s, slot_date: f.date, period: +f.period, room: f.room.trim(),
    start_at: new Date(wallToUtcMs(f.date, f.start, tz)).toISOString(), end_at: new Date(wallToUtcMs(f.date, f.end, tz)).toISOString()}
}
// (ACTION_LABEL is kept for older callers; the readable timeline lives in activity.js)
export const ACTION_LABEL = {upsert_slot: 'Slot saved', set_available: 'Availability changed', delete_slot: 'Slot deleted', cancel: 'Booking cancelled', edit_booking: 'Booking edited', move: 'Booking moved', swap: 'Bookings swapped',
  copy: 'Week copied as draft', publish: 'Drafts published', lockdown: 'Lockdown changed', settings: 'Settings saved', range_available: 'Range opened or closed'}
export const shortDate = d => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(d + 'T12:00:00Z'))
