import {useEffect, useRef, useState} from 'react'
import Icon from '../components/Icon.jsx'
import {Button, Field, KindPill, Pill, SelectControl} from '../components/ui.jsx'
import {hm12, hm24, dateLabel} from '../lib.js'
import {classify, explain, saveOutcome, previewAfter, closeReason, isPaper, PAPER_MARK} from '../slotInfo.js'

const fromSlot = (s, tz) => ({date: s.slot_date, period: String(s.period), start: hm24(s.start_at, tz), end: hm24(s.end_at, tz), room: s.room})
const SEES = {open: 'Open (Reserve button)', unavailable: 'Unavailable', booked: 'Booked', held: 'Held'}

/** Edit one appointment. Shows, in plain words, what students see now and what they WILL see if the form is saved. */
export default function SlotEditor({s, tz, nowMs, run, onClose, onDeleted}) {
  const server = fromSlot(s, tz), sig = JSON.stringify(server), [f, setF] = useState(server), fRef = useRef(f), baseRef = useRef(sig)
  const [why, setWhy] = useState('closed'), [custom, setCustom] = useState('')
  fRef.current = f
  useEffect(() => {   // follow server changes only while the form is untouched, so polling never overwrites typing
    if (baseRef.current === sig) return
    const pristine = JSON.stringify(fRef.current) === baseRef.current; baseRef.current = sig; if (pristine) setF(server)
  }, [sig])   // eslint-disable-line
  const dirty = JSON.stringify(f) !== sig, set = k => e => setF({...f, [k]: e.target.value})
  const c = classify(s, nowMs), after = previewAfter(s, f, tz), pc = classify(after, nowMs)
  const timeBad = f.start && f.end && f.end <= f.start ? 'End time must be after start time.' : '', roomBad = !f.room.trim() ? 'Room is required.' : ''
  const save = async () => {
    if (timeBad || roomBad) return
    const ok = await run('admin_upsert_slot', {p_id: s.id, p_date: f.date, p_period: +f.period, p_start: f.start, p_end: f.end, p_room: f.room}, {ok: saveOutcome(after, nowMs, 'Saved')})
    if (ok) setF({...f})
  }
  const open = () => run('admin_set_available', {p_slot: s.id, p_avail: true, p_reason: null}, {
    confirm: {title: 'Open this time for students?', confirm: 'Open for booking', cancel: 'Keep closed',
      body: isPaper(s) ? 'This time was taken on a paper sign-up sheet. Opening it lets any student reserve it online, and the "Taken on paper" marker is erased. Only continue if that paper sign-up was cancelled.' : 'Students will be able to reserve this time within about 15 seconds.'},
    ok: saveOutcome({...s, available: true, reason: null}, nowMs, 'Opened')})
  const close = () => run('admin_set_available', {p_slot: s.id, p_avail: false, p_reason: closeReason(why, custom)}, {ok: 'Marked unavailable. Students see it as Unavailable.'})
  const del = async () => { const ok = await run('admin_delete_slot', {p_id: s.id}, {confirm: {title: 'Delete this slot?', body: 'This removes it from the schedule for good. Imported slots are your record of the paper sheets, so only delete one you will never need.', confirm: 'Delete slot', cancel: 'Keep it', danger: true}, ok: 'Slot deleted.'}); if (ok) onDeleted() }
  return <div className="editor">
    <header className="panel-head"><div><h3>{dateLabel(s.slot_date)}</h3><h2>Period {s.period} · {hm12(s.start_at, tz)}</h2></div>
      <div className="stackr"><KindPill kind={c.kind} />{c.past && <Pill tone="rose">Past</Pill>}</div></header>
    <div className="ribbon" aria-hidden="true" />
    <div className={'callout ' + (c.past ? 'warn' : c.kind === 'open' ? 'ok' : '')} role="note"><Icon name={c.past ? 'clock' : 'info'} /><div><p>{explain(s, nowMs)}</p>
      {s.reason && !s.available && <p className="small">Reason on record: <b>{s.reason}</b></p>}
      {s.booked && <p className="small">Booked by <b>{s.student_name}</b>{s.assignment ? ` · ${s.assignment}` : ''}</p>}</div></div>
    <fieldset className="grp"><legend>Date, time and room</legend>
      <div className="grid2"><Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Period"><SelectControl value={f.period} onChange={set('period')}>{[...Array(9)].map((_, i) => <option key={i} value={i + 1}>Period {i + 1}</option>)}</SelectControl></Field>
        <Field label="Start"><input type="time" value={f.start} onChange={set('start')} /></Field>
        <Field label="End" error={timeBad}><input type="time" value={f.end} onChange={set('end')} aria-invalid={Boolean(timeBad) || undefined} /></Field></div>
      <Field label="Room" error={roomBad}><input value={f.room} onChange={set('room')} aria-invalid={Boolean(roomBad) || undefined} /></Field>
      {dirty && <div className="callout preview" role="status"><Icon name="sparkle" /><div><b>If you save:</b> {saveOutcome(after, nowMs, 'Saved').replace(/^Saved\. /, '')}
        {!s.available && !pc.past && <p className="small">Editing never changes availability, so it stays closed.</p>}</div></div>}
      {dirty && s.booked && <div className="callout warn" role="alert"><Icon name="alert" /><div><b>This time has an online booking.</b> Saving changes the date, time or room the student sees under My booking. The booking stays, but the student is not told, so let them know.</div></div>}
      <div className="row savebar"><Button variant="primary" onClick={save} disabled={!dirty || Boolean(timeBad || roomBad)}>Save changes</Button><Button disabled={!dirty} onClick={() => setF(server)}>Cancel</Button></div></fieldset>
    <fieldset className="grp"><legend>Availability</legend>
      {s.booked ? <p className="small">This time is booked online. Cancel that booking in Bookings before closing or deleting the slot.</p>
        : !s.available ? <><p className="small">Students see this as <b>Unavailable</b>. It stays closed until you open it on purpose.</p>
          <Button icon="unlock" onClick={open} disabled={c.past}>Open for booking…</Button>
          {c.past && <p className="small warn">This time has passed, so it cannot be opened for booking. Move it to a future date first (above), then open it.</p>}</>
        : <><p className="small">Students {c.past ? 'cannot see this time (it has passed)' : 'can reserve this time'}. Choose why you are closing it:</p>
          <div className="radios">{[['closed', 'Not available'], ['paper', 'Taken on paper sign-up sheet'], ['other', 'Other reason']].map(([k, l]) => <label key={k} className="chk"><input type="radio" name={'why' + s.id} checked={why === k} onChange={() => setWhy(k)} />{l}</label>)}</div>
          {why === 'other' && <Field label="Reason shown to you"><input value={custom} maxLength={80} onChange={e => setCustom(e.target.value)} /></Field>}
          <Button icon="lock" onClick={close}>Mark unavailable</Button></>}
    </fieldset>
    <fieldset className="grp danger"><legend>Delete</legend><Button variant="danger" icon="trash" disabled={s.booked} onClick={del}>Delete slot…</Button>{s.booked && <p className="small">Booked slots cannot be deleted.</p>}</fieldset>
    {onClose && <div className="sheet-foot"><Button onClick={onClose}>Close</Button></div>}
  </div>
}
