import {useEffect, useRef, useState, useMemo} from 'react'
import Icon from '../components/Icon.jsx'
import {downloadAppointmentRoster, printAppointmentRoster} from './appointmentExport.js'
import {Button, Empty, Field, Pill, Sheet, SelectControl, useMedia} from '../components/ui.jsx'
import {hm12, dateLabel} from '../lib.js'
import {classify, shortDate} from '../slotInfo.js'
import {rosterStatus, ROSTER_LABEL, ROSTER_TONE, ROSTER_FILTERS, filterRoster, unhideExposes} from '../roster.js'

const FILTERS = [['upcoming', 'Upcoming'], ['past', 'Past'], ['all', 'All'], ['dup', 'Duplicate names']]

function BookingEditor({b, books, slots, tz, nowMs, run, rosterOn, onClose, onGone}) {
  const sig = JSON.stringify([b.student_name, b.assignment]), [f, setF] = useState({n: b.student_name, a: b.assignment}), base = useRef(sig), fr = useRef(f)
  fr.current = f
  useEffect(() => { if (base.current === sig) return; const pristine = JSON.stringify([fr.current.n, fr.current.a]) === base.current; base.current = sig; if (pristine) setF({n: b.student_name, a: b.assignment}) }, [sig])   // eslint-disable-line
  const [to, setTo] = useState(''), [other, setOther] = useState('')
  const dirty = f.n !== b.student_name || f.a !== b.assignment, bad = !f.n.trim() || !f.a.trim()
  const free = slots.filter(s => s.available && !s.booked && !s.draft && !s.held && !classify(s, nowMs).past)
  const byDay = free.reduce((m, s) => ((m[s.slot_date] ??= []).push(s), m), {})
  const when = `${dateLabel(b.slot_date)} at ${hm12(b.start_at, tz)}`
  return <div className="editor">
    <header className="panel-head"><div><h3>{dateLabel(b.slot_date)}</h3><h2>{b.student_name}</h2></div>{b.dup && <Pill tone="amber">Duplicate name</Pill>}</header>
    <div className="ribbon" aria-hidden="true" />
    <p className="small">Period {b.period} · {hm12(b.start_at, tz)} · Room {b.room}</p>
    <fieldset className="grp"><legend>Edit booking</legend>
      <Field label="Name"><input value={f.n} maxLength={80} onChange={e => setF({...f, n: e.target.value})} /></Field>
      <Field label="Assignment"><input value={f.a} maxLength={200} onChange={e => setF({...f, a: e.target.value})} /></Field>
      <div className="row savebar"><Button variant="primary" disabled={!dirty || bad} onClick={() => run('admin_edit_booking', {p_slot: b.slot_id, p_name: f.n, p_assignment: f.a}, {ok: 'Booking updated.'})}>Save changes</Button><Button disabled={!dirty} onClick={() => setF({n: b.student_name, a: b.assignment})}>Cancel</Button></div></fieldset>
    {'roster_consent' in b && <fieldset className="grp"><legend>Public roster</legend>
      <p className="small"><Pill tone={ROSTER_TONE[rosterStatus(b, rosterOn)]}>{ROSTER_LABEL[rosterStatus(b, rosterOn)]}</Pill> {b.roster_consent ? 'The student agreed to show their display name.' : 'The student did not agree, so this name can never appear publicly.'}</p>
      <Button icon="shield" onClick={() => run('admin_set_name_hidden', {p_slots: [b.slot_id], p_hidden: !b.name_hidden}, {okFn: () => b.name_hidden ? (unhideExposes(b) ? 'Name is no longer hidden.' : 'Hiding removed. The student never agreed, so the name stays private.') : 'Name hidden from the roster.'})}>{b.name_hidden ? 'Stop hiding this name' : 'Hide this name from the roster'}</Button>
      <p className="small">Your hide setting always wins over the student’s choice. You cannot make a name public; only the student can allow that.</p></fieldset>}
    <fieldset className="grp"><legend>Move to another time</legend>
      <Field label="Open future times"><SelectControl value={to} onChange={e => setTo(e.target.value)}><option value="">Choose a time…</option>{Object.entries(byDay).map(([d, ss]) => <optgroup key={d} label={shortDate(d)}>{ss.map(s => <option key={s.id} value={s.id}>{hm12(s.start_at, tz)} · Room {s.room} · P{s.period}</option>)}</optgroup>)}</SelectControl></Field>
      {!free.length && <p className="small">No open future times to move to. Open a slot in Schedule first.</p>}
      <Button icon="move" disabled={!to} onClick={async () => { if (await run('admin_move_booking', {p_from: b.slot_id, p_to: to}, {confirm: {title: 'Move this booking?', body: `${b.student_name} will move from ${when} to the time you chose. The old time becomes open again.`, confirm: 'Move booking'}, ok: 'Booking moved.'})) onGone() }}>Move</Button></fieldset>
    <fieldset className="grp"><legend>Swap with another booking</legend>
      <Field label="Other booking"><SelectControl value={other} onChange={e => setOther(e.target.value)}><option value="">Choose a booking…</option>{books.filter(x => x.slot_id !== b.slot_id).map(x => <option key={x.slot_id} value={x.slot_id}>{shortDate(x.slot_date)} {hm12(x.start_at, tz)} · {x.student_name}</option>)}</SelectControl></Field>
      <Button icon="swap" disabled={!other} onClick={async () => { if (await run('admin_swap_bookings', {p_a: b.slot_id, p_b: other}, {confirm: {title: 'Swap these two bookings?', body: 'The two students trade times. Nothing else changes.', confirm: 'Swap'}, ok: 'Bookings swapped.'})) onGone() }}>Swap</Button></fieldset>
    <fieldset className="grp danger"><legend>Cancel booking</legend><p className="small">Frees the time so students can book it again.</p>
      <Button variant="danger" icon="trash" onClick={async () => { if (await run('admin_cancel', {p_slot: b.slot_id}, {confirm: {title: `Cancel ${b.student_name}'s booking?`, body: `${when} becomes open again and the student's name and assignment are removed. This cannot be undone.`, confirm: 'Cancel booking', cancel: 'Keep booking', danger: true}, ok: 'Booking cancelled. The time is open again.'})) onGone() }}>Cancel booking…</Button></fieldset>
    {onClose && <div className="sheet-foot"><Button onClick={onClose}>Close</Button></div>}
  </div>
}

export default function Bookings({books, slots, tz, nowMs, run, rosterOn = false}) {
  const [q, setQ] = useState(''), [flt, setFlt] = useState('upcoming'), [selId, setSelId] = useState(null), [rf, setRf] = useState('all'), [chk, setChk] = useState(() => new Set()), wide = useMedia('(min-width: 1240px)')
  const past = b => new Date(b.start_at).getTime() <= nowMs
  const counts = {upcoming: books.filter(b => !past(b)).length, past: books.filter(past).length, all: books.length, dup: books.filter(b => b.dup).length}
  const shown = useMemo(() => books.filter(b => (flt === 'all' || (flt === 'upcoming' && !past(b)) || (flt === 'past' && past(b)) || (flt === 'dup' && b.dup)) && (b.student_name + ' ' + b.assignment + ' ' + b.room).toLowerCase().includes(q.toLowerCase())), [books, flt, q, nowMs])   // eslint-disable-line
  const hasRoster = books.some(b => 'roster_consent' in b), vis = useMemo(() => filterRoster(shown, rf, rosterOn), [shown, rf, rosterOn])
  const sel = books.find(b => b.slot_id === selId) || null, picked = [...chk].filter(id => books.some(b => b.slot_id === id))
  const hideMany = hidden => run('admin_set_name_hidden', {p_slots: picked, p_hidden: hidden}, {confirm: {title: hidden ? `Hide ${picked.length} name${picked.length === 1 ? '' : 's'} from the roster?` : `Stop hiding ${picked.length} name${picked.length === 1 ? '' : 's'}?`, body: hidden ? 'These students will show as “Reserved — name hidden”, whatever they chose.' : 'Only students who agreed to show their name will become visible, and only while the roster is on.', confirm: hidden ? 'Hide names' : 'Stop hiding'}, okFn: x => `${x.changed} booking${x.changed === 1 ? '' : 's'} updated.${!hidden && x.no_consent ? ` ${x.no_consent} stay private (no consent).` : ''}`}).then(ok => ok && setChk(new Set()))
  return <div className={'sched ad-admin-page ad-admin-bookings' + (wide ? ' split' : '')}>
    <div className="sched-main">
      <header className="ad-admin-pagehero ad-admin-bookingshero"><div><p className="ad-admin-eyebrow">BOOKING CONTROL · STUDENT CONFERENCES</p><h2>Every conversation, accounted for.</h2><p>Find, adjust, and manage student appointments without losing track of the details.</p></div><div className="ad-admin-hero-stat"><strong className="num">{counts.upcoming}</strong><span>upcoming bookings</span></div></header>
      <div className="appointment-export-actions" role="group" aria-label="Export private appointment roster"><div><strong>Appointment roster</strong><p className="small">Printable teacher copy of all ${books.length} booked appointments, including names and assignments. Not affected by search filters.</p></div><div className="appointment-export-buttons"><Button size="sm" icon="download" disabled={!books.length} onClick={() => downloadAppointmentRoster(books,tz)}>Download document</Button><Button size="sm" icon="printer" disabled={!books.length} onClick={() => {if(!printAppointmentRoster(books,tz)) console.warn('Browser blocked the printable roster pop-up.')}}>Print / Save PDF</Button></div></div>
      <div className="toolbar booking-toolbar"><label className="search schedule-search"><Icon name="search" size={20} /><span className="vh">Search name, assignment or room</span><input type="search" placeholder="Search name, assignment or room…" value={q} onChange={e => setQ(e.target.value)} /></label>
        <div className="chips" role="group" aria-label="Booking filter">{FILTERS.map(([k, l]) => <button key={k} className="chip" aria-pressed={flt === k} onClick={() => setFlt(k)}>{l} <b className="num">{counts[k]}</b></button>)}</div></div>
      {hasRoster && <div className="rosterbar"><span className={'pill ' + (rosterOn ? 'amber' : 'slate')}>Public roster: {rosterOn ? 'ON' : 'OFF'}</span>
        <div className="chips" role="group" aria-label="Roster visibility filter">{ROSTER_FILTERS.map(([k, l]) => <button key={k} className="chip" aria-pressed={rf === k} onClick={() => setRf(k)}>{l}</button>)}</div>
        <Button size="sm" onClick={() => setChk(c => new Set([...c, ...vis.map(b => b.slot_id)]))}>Select shown ({vis.length})</Button></div>}
      {picked.length > 0 && <div className="bulkbar inline" role="region" aria-label="Selected bookings actions"><b className="num">{picked.length} selected</b><Button size="sm" icon="shield" onClick={() => hideMany(true)}>Hide names</Button><Button size="sm" onClick={() => hideMany(false)}>Stop hiding</Button><Button size="sm" variant="ghost" icon="x" onClick={() => setChk(new Set())}>Clear</Button></div>}
      <p className="small count-line" aria-live="polite">{vis.length} booking(s). “Duplicate name” warns when the same name booked twice.</p>
      {!vis.length ? <Empty title={books.length ? 'No bookings match' : 'No bookings yet'}>{books.length ? 'Try another filter or search.' : 'Bookings students make on the website appear here. Paper sign-ups are not listed because they have no names.'}</Empty>
        : <ul className="brows">{vis.map(b => <li key={b.slot_id} className="brow-wrap">{hasRoster && <label className="pick"><input type="checkbox" checked={chk.has(b.slot_id)} onChange={() => setChk(c => { const n = new Set(c); n.has(b.slot_id) ? n.delete(b.slot_id) : n.add(b.slot_id); return n })} aria-label={`Select booking ${b.student_name}`} /></label>}<button className={'brow' + (past(b) ? ' past' : '')} aria-pressed={selId === b.slot_id} onClick={() => setSelId(b.slot_id)}>
          <span className="brow-d"><b>{shortDate(b.slot_date)}</b><small className="num">{hm12(b.start_at, tz)}</small></span>
          <span className="brow-n"><b>{b.student_name}</b>{b.dup && <span className="tag warn">Duplicate name</span>}{hasRoster && <Pill tone={ROSTER_TONE[rosterStatus(b, rosterOn)]}>{ROSTER_LABEL[rosterStatus(b, rosterOn)]}</Pill>}<small>{b.assignment}</small></span>
          <span className="tag"><Icon name="door" size={14} />{b.room}</span><Icon name="right" size={18} className="chev" /></button></li>)}</ul>}
    </div>
    {wide && <aside className="sched-side" aria-label="Edit booking">{sel ? <BookingEditor key={sel.slot_id} b={sel} books={books} slots={slots} tz={tz} nowMs={nowMs} run={run} rosterOn={rosterOn} onGone={() => setSelId(null)} /> : <Empty title="Select a booking">Edit the name or assignment, move it to another time, swap two students, or cancel it.</Empty>}</aside>}
    {!wide && sel && <Sheet label="Edit booking" onClose={() => setSelId(null)}>{close => <BookingEditor key={sel.slot_id} b={sel} books={books} slots={slots} tz={tz} nowMs={nowMs} run={run} rosterOn={rosterOn} onClose={close} onGone={close} />}</Sheet>}
  </div>
}
