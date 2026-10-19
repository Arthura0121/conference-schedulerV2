import {useState} from 'react'
import {Button, Field} from '../components/ui.jsx'
import {addDays, schoolToday} from '../slotInfo.js'
import {validateNewSlot} from './scheduleValidation.js'
const span = (a, b) => (new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5
/** Add / copy / bulk tools. Bulk tools use their OWN short date range because the database limits copy and open/close to 92 days. */
export default function ScheduleTools({tz, run, nowMs, done}) {
  const t = schoolToday(tz, nowMs), [nf, setNf] = useState({date: addDays(t, 1), period: 3, start: '09:46', end: '09:56', room: ''})
  const [cp, setCp] = useState({from: addDays(t, -7), to: addDays(t, -3), dest: addDays(t, 7)}), [br, setBr] = useState({from: t, to: addDays(t, 13)})
  const newSlotError = validateNewSlot(nf)
  const bad = (r) => !r.from || !r.to || r.to < r.from ? 'Choose a start date and an end date after it.' : span(r.from, r.to) > 92 ? 'Use a range of 92 days or less.' : ''
  const go = async (...a) => { if (await run(...a)) done?.() }
  return <div className="stack">
    <section className="grp"><h3>Add a slot</h3>
      <div className="grid2"><Field label="Date"><input type="date" value={nf.date} onChange={e => setNf({...nf, date: e.target.value})} /></Field><Field label="Period"><input type="number" min="1" max="9" value={nf.period} onChange={e => setNf({...nf, period: +e.target.value})} /></Field>
        <Field label="Start"><input type="time" value={nf.start} onChange={e => setNf({...nf, start: e.target.value})} /></Field><Field label="End"><input type="time" value={nf.end} onChange={e => setNf({...nf, end: e.target.value})} /></Field></div>
      <Field label="Room"><input value={nf.room} onChange={e => setNf({...nf, room: e.target.value})} /></Field>
      <Button variant="primary" disabled={Boolean(newSlotError)} onClick={() => go('admin_upsert_slot', {p_id: null, p_date: nf.date, p_period: nf.period, p_start: nf.start, p_end: nf.end, p_room: nf.room}, {ok: nf.date <= t ? 'Slot added, but that day has passed so students will not see it.' : 'Slot added. Students see it as Open within about 15 seconds.'})}>Add slot</Button>{newSlotError && <p className="small warn" role="alert">{newSlotError}</p>}</section>
    <section className="grp"><h3>Copy a week as a template</h3><p className="small">Copies dates, times, rooms and availability only. Never students, bookings, or holds. New copies are hidden drafts until you publish.</p>
      <div className="grid2"><Field label="Source from"><input type="date" value={cp.from} onChange={e => setCp({...cp, from: e.target.value})} /></Field><Field label="Source to"><input type="date" value={cp.to} onChange={e => setCp({...cp, to: e.target.value})} /></Field></div>
      <Field label="New start date"><input type="date" value={cp.dest} onChange={e => setCp({...cp, dest: e.target.value})} /></Field>
      <Button disabled={Boolean(bad(cp))} onClick={() => go('admin_copy_schedule', {p_from: cp.from, p_to: cp.to, p_dest: cp.dest, p_draft: true}, {ok: 'Copied as hidden drafts.'})}>Copy as draft</Button>{bad(cp) && <p className="small warn">{bad(cp)}</p>}</section>
    <section className="grp"><h3>Bulk actions for a date range</h3><p className="small">Applies to every slot between these dates (92 days at most).</p>
      <div className="grid2"><Field label="From"><input type="date" value={br.from} onChange={e => setBr({...br, from: e.target.value})} /></Field><Field label="To"><input type="date" value={br.to} onChange={e => setBr({...br, to: e.target.value})} /></Field></div>
      {bad(br) && <p className="small warn">{bad(br)}</p>}
      <div className="row"><Button disabled={Boolean(bad(br))} onClick={() => go('admin_publish_range', {p_from: br.from, p_to: br.to}, {confirm: {title: 'Publish drafts?', body: 'Every draft in these dates becomes visible to students.', confirm: 'Publish'}, ok: 'Drafts published.'})}>Publish drafts</Button>
        <Button disabled={Boolean(bad(br))} onClick={() => go('admin_set_range_available', {p_from: br.from, p_to: br.to, p_avail: false}, {confirm: {title: 'Close every open slot in this range?', body: 'Open, unbooked slots become unavailable. Booked slots are not touched.', confirm: 'Close range', danger: true}, ok: 'Range closed.'})}>Close range</Button>
        <Button disabled={Boolean(bad(br))} onClick={() => go('admin_set_range_available', {p_from: br.from, p_to: br.to, p_avail: true}, {confirm: {title: 'Reopen slots that Close range closed?', body: 'Slots marked Not available or taken on paper stay closed. Open those one at a time in the editor.', confirm: 'Reopen'}, ok: 'Range reopened.'})}>Reopen range</Button></div></section>
  </div>
}
