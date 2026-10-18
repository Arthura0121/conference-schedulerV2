import {useState, useMemo, useEffect} from 'react'
import Icon from '../components/Icon.jsx'
import {Button, Empty, Pill, KindPill, Sheet, SelectControl, useMedia} from '../components/ui.jsx'
import SlotEditor from './SlotEditor.jsx'
import ScheduleTools from './ScheduleTools.jsx'
import BulkDialog from './BulkDialog.jsx'
import BulkBar from './BulkBar.jsx'
import {toggleId, selectAll, deselectAll, pruneSelection, selectedSlots, scopeText, hiddenSelected} from '../bulk.js'
import {hm12, dateLabel} from '../lib.js'
import {classify, filterSlots, statusCounts, groupByDate, STATUS_FILTERS, shortDate, rangePreset, schoolToday} from '../slotInfo.js'

const FLABEL = {all: 'All', open: 'Open', closed: 'Unavailable', paper: 'Paper', booked: 'Booked', draft: 'Draft', past: 'Past'}
const PRESETS = [['all', 'All dates'], ['upcoming', 'Upcoming'], ['past', 'Past']]

export default function Schedule({slots, tz, nowMs, run, rpc, range, setRange}) {
  const [q, setQ] = useState(''), [status, setStatus] = useState('all'), [period, setPeriod] = useState('all'), [selId, setSelId] = useState(null), [tools, setTools] = useState(false), [room, setRoom] = useState('all'), [checked, setChecked] = useState(() => new Set()), [bulk, setBulk] = useState(null)
  const wide = useMedia('(min-width: 1240px)')
  const counts = useMemo(() => statusCounts(slots, nowMs), [slots, nowMs])
  const shown = useMemo(() => filterSlots(slots, {q, status, period, room}, nowMs), [slots, q, status, period, room, nowMs])
  useEffect(() => { setChecked(c => { const n = pruneSelection(c, slots); return n.size === c.size ? c : n }) }, [slots])   // forget appointments that vanished (deleted elsewhere / outside the date range)
  const picked = useMemo(() => selectedSlots(checked, slots), [checked, slots]), rooms = useMemo(() => [...new Set(slots.map(s => s.room))].sort(), [slots])
  const hiddenPicked = useMemo(() => hiddenSelected(picked, shown), [picked, shown])
  const filt = {from: range.from, to: range.to, status, period, room, q: q.trim()}
  const days = useMemo(() => groupByDate(shown), [shown])
  const sel = slots.find(s => s.id === selId) || null, periods = [...new Set(slots.map(s => s.period))].sort((a, b) => a - b)
  const today = schoolToday(tz, nowMs)
  const editor = sel && <SlotEditor key={sel.id} s={sel} tz={tz} nowMs={nowMs} run={run} onDeleted={() => setSelId(null)} onClose={wide ? null : undefined} />
  const releaseDay = async d => {
    const ids = slots.filter(s => s.slot_date === d).map(s => s.id)
    if (!ids.length) return
    const ok = await run('admin_publish_range', {p_from: d, p_to: d}, {confirm: {
      title: `Publish drafts for ${shortDate(d)}?`,
      body: 'Draft appointments on this day will become visible. Aurora will then show the protected server preview before anything is opened.',
      confirm: 'Publish & continue'
    }, okFn: n => `Published ${n} draft appointment${n === 1 ? '' : 's'}. Review the opening preview next.`})
    if (ok) setBulk({mode: 'release-day', avail: true, ids, date: d})
  }
  return <div className={'sched ad-admin-page ad-admin-schedule' + (wide ? ' split' : '')}>
    <div className="sched-main">
      <header className="ad-admin-pagehero ad-admin-schedulehero"><div><p className="ad-admin-eyebrow">THE SCHEDULE · LIVE CONTROL</p><h2>Shape the week.</h2><p>Make space for conferences, manage availability, and keep every meeting in sync.</p></div><div className="ad-admin-hero-stat"><strong className="num">{counts.open}</strong><span>open slots in view</span></div></header>
      <div className="toolbar schedule-toolbar">
        <div className="schedule-toolbar-top">
          <label className="search schedule-search"><Icon name="search" size={20} /><span className="vh">Search slots</span><input type="search" placeholder="Search room, reason, date…" value={q} onChange={e => setQ(e.target.value)} /></label>
          <Button icon="plus" variant="primary" aria-label="Add & tools" onClick={() => setTools(true)}>Add<span className="hide-sm"> &amp; tools</span></Button>
        </div>
        <div className="chips schedule-status-chips" role="group" aria-label="Status filter">{STATUS_FILTERS.map(k => <button key={k} className="chip" aria-pressed={status === k} onClick={() => setStatus(k)}>{FLABEL[k]} <b className="num">{counts[k]}</b></button>)}</div>
        <div className="schedule-filter-grid">
          <label className="mini schedule-filter"><span>Room</span><SelectControl value={room} onChange={e => setRoom(e.target.value)}><option value="all">All</option>{rooms.map(r => <option key={r} value={r}>{r}</option>)}</SelectControl></label>
          <label className="mini schedule-filter"><span>Period</span><SelectControl value={period} onChange={e => setPeriod(e.target.value)}><option value="all">All</option>{periods.map(p => <option key={p} value={p}>{p}</option>)}</SelectControl></label>
          <label className="mini schedule-filter"><span>From</span><input type="date" value={range.from} max={range.to} onChange={e => e.target.value && setRange({...range, from: e.target.value})} /></label>
          <label className="mini schedule-filter"><span>To</span><input type="date" value={range.to} min={range.from} onChange={e => e.target.value && setRange({...range, to: e.target.value})} /></label>
          <div className="chips schedule-date-presets" role="group" aria-label="Dates shown">{PRESETS.map(([k, l]) => { const r = rangePreset(k, tz, nowMs); return <button key={k} className="chip" aria-pressed={range.from === r.from && range.to === r.to} onClick={() => setRange(r)}>{l}</button> })}</div>
        </div>
      </div>
      <div className="bulkrow" role="group" aria-label="Bulk selection and actions">
        <Button size="sm" disabled={!shown.length} onClick={() => setChecked(c => selectAll(c, shown))}>Select all shown ({shown.length})</Button>
        <Button size="sm" disabled={!checked.size} onClick={() => setChecked(deselectAll())}>Deselect all</Button>
        <span className="spacer" />
        <Button size="sm" icon="unlock" disabled={!shown.length} onClick={() => setBulk({mode: 'shown', avail: true})}>Open all shown…</Button>
        <Button size="sm" icon="lock" disabled={!shown.length} onClick={() => setBulk({mode: 'shown', avail: false})}>Close all shown…</Button></div>
      <p className="small count-line" aria-live="polite">{shown.length} of {slots.length} slots · {range.from} to {range.to}{picked.length ? ` · ${picked.length} selected${hiddenPicked ? ` (${hiddenPicked} hidden by filters)` : ''}` : ''}</p>
      {!slots.length ? <Empty title="No slots in this date range">Try “All dates”, or add a slot with Add &amp; tools.</Empty>
        : !shown.length ? <Empty title="Nothing matches those filters"><Button size="sm" onClick={() => {setQ(''); setStatus('all'); setPeriod('all')}}>Clear filters</Button></Empty>
        : days.map(d => <section key={d.date} className="sday ad-schedule-day"><h3 className="sday-h"><span>{shortDate(d.date)}</span>{d.date === today && <Pill tone="amber">Today</Pill>}{d.date < today && <span className="tag">Past day</span>}<span className="spacer" />{d.date >= today && <Button size="sm" variant="primary" icon="unlock" onClick={() => releaseDay(d.date)}>Publish &amp; open day…</Button>}</h3>
          {d.periods.map(p => <div key={p.period} className="sper"><h4><span className="ad-sched-period-mark" aria-hidden="true"/>Period {p.period}</h4>
            <ul className="srows">{p.items.map(s => { const c = classify(s, nowMs); return <li key={s.id} className="srow-wrap">
              <label className="pick"><input type="checkbox" checked={checked.has(s.id)} onChange={() => setChecked(c => toggleId(c, s.id))} aria-label={`Select ${dateLabel(s.slot_date)} period ${s.period} ${hm12(s.start_at, tz)}, room ${s.room}`} /></label>
              <button className={`srow ${c.kind}${c.past ? ' past' : ''}`} aria-pressed={selId === s.id} onClick={() => setSelId(s.id)} aria-label={`${dateLabel(s.slot_date)} period ${s.period} ${hm12(s.start_at, tz)}, room ${s.room}, ${c.label}${c.past ? ', past' : ''}`}>
                <span className="srow-t num">{hm12(s.start_at, tz)}<small>to {hm12(s.end_at, tz)}</small></span>
                <span className="tag"><Icon name="door" size={14} />{s.room}</span>
                <span className="srow-s"><KindPill kind={c.kind} />{c.past && <span className="tag warn">Past</span>}</span>
                {s.booked && <span className="srow-n small">{s.student_name}</span>}
              </button></li> })}</ul></div>)}</section>)}
    </div>
    {picked.length > 0 && <BulkBar count={picked.length} hidden={hiddenPicked} onOpen={() => setBulk({mode: 'selected', avail: true})} onClose={() => setBulk({mode: 'selected', avail: false})} onClear={() => setChecked(deselectAll())} />}
    {bulk && (() => {
      const target = bulk.mode === 'selected' ? picked : bulk.mode === 'release-day' ? slots.filter(x => bulk.ids.includes(x.id)) : shown
      const scope = bulk.mode === 'release-day' ? `all ${target.length} appointments on ${shortDate(bulk.date)}` : scopeText({mode: bulk.mode, count: target.length, f: filt, hidden: bulk.mode === 'selected' ? hiddenPicked : 0})
      return <BulkDialog key={bulk.mode + bulk.avail + (bulk.date || '')} ids={target.map(x => x.id)} avail={bulk.avail} scope={scope} rpc={rpc} run={run} onClose={() => setBulk(null)} />
    })()}
    {wide && <aside className="sched-side" aria-label="Edit appointment">{editor || <Empty title="Select an appointment">Pick any row to see its status, edit its time or room, and change its availability. Imported and past appointments are all here.</Empty>}</aside>}
    {!wide && sel && <Sheet label="Edit appointment" onClose={() => setSelId(null)}>{close => <SlotEditor key={sel.id} s={sel} tz={tz} nowMs={nowMs} run={run} onClose={close} onDeleted={close} />}</Sheet>}
    {tools && <Sheet label="Add and tools" title="Add &amp; tools" wide onClose={() => setTools(false)}>{close => <ScheduleTools tz={tz} run={run} nowMs={nowMs} done={close} />}</Sheet>}
  </div>
}
