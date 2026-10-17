// Turns admin_events rows (old technical strings AND new structured ones) into a readable timeline. No React, no network. Unit-tested.
// Rules: never invent details. If a slot cannot be resolved (deleted, or older database), say so plainly. Never show student names here.
import {hm12} from './lib.js'
import {shortDate, addDays} from './slotInfo.js'

const TF = {true: true, false: false}
const nice = a => String(a || 'Activity').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
export const slotText = (s, tz) => !s ? '' : `${shortDate(s.date)} · ${hm12(s.start_at, tz)} · Room ${s.room}`
const rangeText = (a, b) => a === b ? shortDate(a) : `${shortDate(a)} through ${shortDate(b)}`
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

/** @returns {{icon:string,tone:string,title:string,text:string,detail:string}} icon names exist in components/Icon.jsx */
export function describeEvent(e, tz = 'America/New_York') {
  const a = String(e.action || ''), d = String(e.detail ?? ''), m = e.meta && typeof e.meta === 'object' ? e.meta : null
  const A = slotText(e.slot_a, tz), B = slotText(e.slot_b, tz)
  const mk = (icon, tone, title, text, detail = '') => ({icon, tone, title, text, detail})
  switch (a) {
    case 'bulk_available': {
      const open = m ? m.action === 'open' : /^open/.test(d), n = m ? m.changed : Number((d.match(/(\d+)\//) || [])[1])
      const sk = m?.skipped, skipped = sk ? ['paper', 'booked', 'past', 'draft', 'already', 'needs_opt_in', 'missing'].reduce((t, k) => t + (sk[k] || 0), 0) : null
      const lab = {paper: 'taken on paper', booked: 'with online bookings', past: 'in the past', draft: 'drafts', already: 'already in that state', needs_opt_in: 'left closed (not opted in)', missing: 'no longer exist'}
      const det = sk ? Object.entries(lab).filter(([k]) => sk[k]).map(([k, l]) => `${sk[k]} ${l}`).join(' · ') : ''
      return mk(open ? 'unlock' : 'lock', open ? 'mint' : 'slate', open ? 'Appointments opened' : 'Appointments closed',
        Number.isFinite(n) ? `${plural(n, 'appointment')} ${open ? 'opened for students' : 'closed'}${skipped ? `; ${plural(skipped, 'protected or unchanged appointment')} skipped` : ''}.` : `Several appointments were ${open ? 'opened' : 'closed'}.`, det)
    }
    case 'range_available': {
      const mm = d.match(/^(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d):(true|false)$/)
      if (!mm) return mk('calendar', 'slate', 'Date range changed', 'Appointments in a date range were opened or closed.')
      const on = TF[mm[3]]
      return mk(on ? 'unlock' : 'lock', on ? 'mint' : 'slate', on ? 'Appointments reopened' : 'Appointments closed', `Appointments from ${rangeText(mm[1], mm[2])} were ${on ? 'made available' : 'closed'}.`)
    }
    case 'set_available': {
      const on = /:true$/.test(d), off = /:false$/.test(d)
      if (!on && !off) return mk('edit', 'slate', 'Availability changed', 'An appointment was opened or closed.', A)
      return mk(on ? 'unlock' : 'lock', on ? 'mint' : 'slate', on ? 'Appointment opened' : 'Appointment closed', on ? 'An appointment was made available to students.' : 'An appointment was marked unavailable.', A)
    }
    case 'upsert_slot': return mk('edit', 'peri', 'Appointment saved', 'An appointment was created or its date, time or room was changed.', A)
    case 'delete_slot': return mk('trash', 'rose', 'Appointment deleted', 'An appointment was removed from the schedule.', A)
    case 'cancel': return mk('x', 'rose', 'Conference cancelled', 'A student\u2019s conference booking was cancelled.', A)
    case 'edit_booking': return mk('edit', 'peri', 'Booking edited', 'A student\u2019s name or assignment was corrected.', A)
    case 'move': return mk('move', 'violet', 'Conference moved', 'A booking was moved to a different appointment.', A && B ? `From ${A} to ${B}` : B || A)
    case 'swap': return mk('swap', 'violet', 'Bookings swapped', 'Two students traded appointment times.', A && B ? `${A} \u2194 ${B}` : '')
    case 'copy': {
      const mm = d.match(/^(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d) \+(-?\d+) draft=(true|false)$/)
      if (!mm) return mk('copy', 'peri', 'Schedule copied', 'A week of appointments was copied.')
      const dest = addDays(mm[1], +mm[3]), destEnd = addDays(mm[2], +mm[3])
      return mk('copy', 'peri', 'Schedule copied', `Appointments from ${rangeText(mm[1], mm[2])} were copied to ${rangeText(dest, destEnd)}${mm[4] === 'true' ? ' as drafts' : ''}.`)
    }
    case 'publish': {
      const mm = d.match(/^(\d{4}-\d\d-\d\d)\.\.(\d{4}-\d\d-\d\d)$/)
      return mk('sparkle', 'mint', 'Drafts published', mm ? `Draft appointments from ${rangeText(mm[1], mm[2])} are now visible to students.` : 'Draft appointments were published.')
    }
    case 'lockdown': {
      const on = /true/.test(d)
      return on ? mk('lock', 'rose', 'Website locked', 'Student scheduling was temporarily disabled.') : mk('unlock', 'mint', 'Website unlocked', 'Students can access the scheduling calendar again.')
    }
    case 'settings': return mk('sliders', 'slate', 'Settings updated', 'Teacher configuration was changed.')
    case 'roster_public': {
      const on = m ? m.on : d === 'true'
      return mk('user', on ? 'amber' : 'slate', on ? 'Public roster turned on' : 'Public roster turned off', on ? 'Students can now see names only for classmates who agreed to show them (and not hidden by you).' : 'Students see availability only. No names are shown.')
    }
    case 'roster_hide': {
      const hid = m ? m.hidden : /^true/.test(d), n = m ? m.changed : Number((d.match(/(\d+)$/) || [])[1])
      return mk('shield', 'slate', hid ? 'Names hidden from roster' : 'Roster hiding removed', Number.isFinite(n) ? `${plural(n, 'booking')} ${hid ? 'hidden from' : 'no longer hidden on'} the public roster.${!hid && m?.no_consent ? ' Names without student consent stay private.' : ''}` : 'Roster visibility of some bookings changed.')
    }
    default: return mk('info', 'slate', nice(a), 'This older activity entry has no further details.')
  }
}

/** Group newest-first events by school day with friendly headings. */
export function groupActivity(events, tz = 'America/New_York', nowMs = Date.now()) {
  const day = iso => new Intl.DateTimeFormat('en-CA', {timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(iso))
  const today = day(new Date(nowMs).toISOString()), yest = addDays(today, -1), groups = []
  for (const e of events) {
    const k = day(e.happened_at)
    let g = groups[groups.length - 1]
    if (!g || g.date !== k) { g = {date: k, label: k === today ? 'Today' : k === yest ? 'Yesterday' : shortDate(k), items: []}; groups.push(g) }
    g.items.push({...e, ...describeEvent(e, tz), time: new Intl.DateTimeFormat('en-US', {timeZone: tz, hour: 'numeric', minute: '2-digit'}).format(new Date(e.happened_at))})
  }
  return groups
}
