// Bulk open/close helpers. No React, no network.
// bulkPreview() MIRRORS the SQL function bulk_classify() so the toolbar can explain things instantly; the dialog's numbers come from the SERVER dry run
// (admin_bulk_set_available with p_dry_run=true), and the server re-checks everything again when the action really runs.
import {isPaper, isPast} from './slotInfo.js'

export const CLOSED_BY_TEACHER = 'Closed by teacher'
export const MAX_BULK = 500

/** Same decision order as SQL bulk_classify: past, draft, booked, paper, already-state, needs opt-in, eligible. */
export function classifyForBulk(s, avail, includeOther, nowMs = Date.now()) {
  if (isPast(s, nowMs)) return 'past'
  if (s.draft) return 'draft'
  if (s.booked) return 'booked'
  if (isPaper(s)) return 'paper'
  if (avail && s.available) return 'already_open'
  if (!avail && !s.available) return 'already_closed'
  if (avail && s.reason !== CLOSED_BY_TEACHER && !includeOther) return 'needs_opt_in'
  return 'eligible'
}
export function bulkPreview(slots, avail, {includeOther = false, nowMs = Date.now()} = {}) {
  const out = {requested: slots.length, eligible: 0, already_open: 0, already_closed: 0, paper: 0, booked: 0, past: 0, draft: 0, needs_opt_in: 0, held_released: 0, eligibleIds: []}
  for (const s of slots) {
    const c = classifyForBulk(s, avail, includeOther, nowMs); out[c]++
    if (c === 'eligible') { out.eligibleIds.push(s.id); if (!avail && s.held) out.held_released++ }
  }
  return out
}
/** Slots that cannot be changed by an ordinary bulk action no matter what: the "protected" set. */
export const protectedCount = (slots, nowMs) => slots.filter(s => isPast(s, nowMs) || s.draft || s.booked || isPaper(s)).length

// ---- selection (a Set of slot ids) ----
export const toggleId = (set, id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n }
export const selectAll = (set, slots) => { const n = new Set(set); slots.forEach(s => n.add(s.id)); return n }
export const deselectAll = () => new Set()
/** Drop ids that are no longer in the loaded data (deleted by someone else, outside the date range). */
export const pruneSelection = (set, slots) => { const ids = new Set(slots.map(s => s.id)); return new Set([...set].filter(i => ids.has(i))) }
export const selectedSlots = (set, slots) => slots.filter(s => set.has(s.id))
/** "all shown" is bigger than the server limit: tell the user instead of silently truncating. */
export const overLimit = n => n > MAX_BULK

/** Plain-language scope sentence for the confirmation dialog, built from the filters that produced the list. */
export function scopeText({mode, count, f = {}, hidden = 0}) {
  if (mode === 'selected') return `${count} selected appointment${count === 1 ? '' : 's'}${hidden ? ` (${hidden} of them hidden by the current filters)` : ''}`
  const parts = []
  if (f.from && f.to) parts.push(`${f.from} to ${f.to}`)
  if (f.status && f.status !== 'all') parts.push(`status “${f.status}”`)
  if (f.period && f.period !== 'all') parts.push(`period ${f.period}`)
  if (f.room && f.room !== 'all') parts.push(`room ${f.room}`)
  if (f.q) parts.push(`search “${f.q}”`)
  return `all ${count} appointment${count === 1 ? '' : 's'} currently shown${parts.length ? ' (' + parts.join(', ') + ')' : ''}`
}
/** One sentence describing what will and will not happen. Used in the dialog and in tests. */
export function bulkExplain(avail, r) {
  const bits = []
  bits.push(avail ? `${r.eligible} appointment${r.eligible === 1 ? '' : 's'} will open for students to reserve.` : `${r.eligible} appointment${r.eligible === 1 ? '' : 's'} will close; students will see them as Unavailable.`)
  if (!avail && r.held_released) bits.push(`${r.held_released} student${r.held_released === 1 ? ' is' : 's are'} choosing one right now and will lose that 60-second hold.`)
  if (r.paper) bits.push(`${r.paper} taken on paper stay untouched.`)
  if (r.booked) bits.push(`${r.booked} with online bookings stay untouched (no booking is cancelled).`)
  if (r.past) bits.push(`${r.past} in the past stay untouched.`)
  if (r.draft) bits.push(`${r.draft} draft${r.draft === 1 ? '' : 's'} stay hidden (publish them first).`)
  return bits.join(' ')
}

/** how many selected appointments the current filters are hiding. They are still selected, so the teacher must be told. */
export const hiddenSelected = (picked, shown) => { const ids = new Set(shown.map(s => s.id)); return picked.filter(s => !ids.has(s.id)).length }
/** the server re-checks everything at confirm time. If it changed fewer appointments than the preview promised, say so in plain words. */
export const staleNote = (previewedEligible, changed) => Number.isFinite(previewedEligible) && changed !== previewedEligible
  ? ` The preview said ${previewedEligible}, but the schedule changed in the meantime, so only the appointments that were still allowed were changed.` : ''

// ---- floating toolbar clearance ----
export const KEYBOARD_MIN_PX = 120   // a visual-viewport shrink smaller than this is browser chrome (URL bar), not an on-screen keyboard
/** How many CSS pixels of the layout viewport the on-screen keyboard covers (0 when it is not clearly a keyboard). */
export function keyboardInset(layoutH, vvH, vvTop) {
  const covered = Math.round(layoutH - vvH - vvTop)
  return covered >= KEYBOARD_MIN_PX ? covered : 0
}
