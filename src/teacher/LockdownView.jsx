import {useState} from 'react'
import Icon from '../components/Icon.jsx'
import {lockScheduleError, recurringLockError, toDatetimeLocal, toIsoOrNull} from './lockDatetime.js'
import {Button, Field, Pill} from '../components/ui.jsx'

const units = ['day','week','month','year']
const siteTime = (value, timeZone) => new Date(value).toLocaleString(undefined,{
  timeZone, weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'
})

function ManualLock({cfg,locked,lm,run}) {
  const [until,setUntil] = useState('')
  const error = lockScheduleError('',until,{immediate:true})
  const lock = async () => {
    const saved = await run('admin_set_manual_lock',{p_locked:true,p_msg:lm,p_until:toIsoOrNull(until)},{
      confirm:{title:'Lock the student site now?',body:until ? 'The manual lock ends at the chosen time.' : 'The manual lock stays active until you end it.',confirm:'Lock now',danger:true},
      ok:'Manual lock is active.'
    })
    if(saved)setUntil('')
  }
  return <section className="card stack lockdown-card lockdown-card-manual" aria-labelledby="manual-lock-title">
    <h2 id="manual-lock-title">Manual website controls</h2>
    <p className="small" aria-live="polite">{cfg.locked
      ? (cfg.manual_lock_until ? 'Manual lock ends '+siteTime(cfg.manual_lock_until,cfg.tz)+'.' : 'Manual lock is active until you end it.')
      : locked ? 'A scheduled or editing lock is active. There is no manual lock to end.' : 'No manual lock is active.'}</p>
    <div className="row lockdown-manual-actions">
      <Button variant="danger" icon="lock" disabled={Boolean(error)} onClick={lock}>Lock website now</Button>
      <Button icon="unlock" disabled={!cfg.locked} onClick={()=>run('admin_set_manual_lock',{p_locked:false,p_msg:null,p_until:null},{ok:'Manual lock ended.'})}>Unlock website now</Button>
    </div>
    <Field label="Manual reopen time (optional)"><input type="datetime-local" value={until} onChange={e=>setUntil(e.target.value)} /></Field>
    {error && <p className="small" role="alert">{error}</p>}
    <p className="small">Unlocking ends the manual lock. Scheduled and editing locks run independently.</p>
  </section>
}

function OneTimeLock({cfg,lm,run}) {
  const [start,setStart] = useState(()=>toDatetimeLocal(cfg.lock_from))
  const [end,setEnd] = useState(()=>toDatetimeLocal(cfg.lock_until))
  const error = lockScheduleError(start,end) || lockScheduleError('',end,{immediate:true})
  return <section className="card stack lockdown-card">
    <h3>One-time schedule</h3>
    <p className="small">Times use this device’s time zone. A schedule with a reopen time expires automatically.</p>
    <div className="grid2">
      <Field label="Scheduled lock starts"><input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} /></Field>
      <Field label="Scheduled reopen time (optional)"><input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} /></Field>
    </div>
    {error && <p className="small" role="alert">{error}</p>}
    <div className="row">
      <Button variant="primary" disabled={!start || Boolean(error)} onClick={()=>run('admin_set_lock_schedule',{p_msg:lm,p_from:toIsoOrNull(start),p_until:toIsoOrNull(end)},{ok:'One-time schedule saved.'})}>Save one-time schedule</Button>
      {cfg.lock_from && <Button onClick={()=>run('admin_set_lock_schedule',{p_msg:null,p_from:null,p_until:null},{ok:'One-time schedule cleared.'})}>Clear one-time schedule</Button>}
    </div>
  </section>
}

function RecurringLock({cfg,lm,run}) {
  const [start,setStart] = useState(cfg.recurring_start?.slice(0,16) ?? '')
  const [end,setEnd] = useState(cfg.recurring_end?.slice(0,16) ?? '')
  const [unit,setUnit] = useState(cfg.recurring_unit ?? 'week')
  const [every,setEvery] = useState(cfg.recurring_every ?? 1)
  const error = recurringLockError(start,end,every,unit)
  return <section className="card stack lockdown-card lockdown-card-recurring">
    <h3>Recurring schedule</h3>
    <p className="small">Repeats in <b>{cfg.tz}</b> at the same local time, even when daylight saving changes. Monthly and yearly dates that don’t exist use the last day of that month.</p>
    {cfg.recurring_next && <p className="small"><b>{cfg.recurring_active ? 'This occurrence ends' : 'Next lock starts'}</b> {siteTime(cfg.recurring_next,cfg.tz)}</p>}
    <div className="grid2">
      <Field label="First recurring lock starts"><input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} /></Field>
      <Field label="First recurring lock reopens"><input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} /></Field>
    </div>
    <div className="grid2">
      <Field label="Repeat every"><input type="number" min="1" max="30" step="1" value={every} onChange={e=>setEvery(e.target.value)} /></Field>
      <Field label="Repeat unit"><select value={unit} onChange={e=>setUnit(e.target.value)}>{units.map(value=><option key={value} value={value}>{value}{Number(every)===1 ? '' : 's'}</option>)}</select></Field>
    </div>
    {start && end && error && <p className="small" role="alert">{error}</p>}
    <div className="row">
      <Button variant="primary" disabled={Boolean(error)} onClick={()=>run('admin_set_recurring_lock',{p_msg:lm,p_start:start,p_end:end,p_unit:unit,p_every:Number(every)},{ok:'Recurring schedule saved.'})}>Save recurring schedule</Button>
      {cfg.recurring_start && <Button onClick={()=>run('admin_set_recurring_lock',{p_msg:null,p_start:null,p_end:null,p_unit:null,p_every:null},{ok:'Recurring schedule cleared.'})}>Clear recurring schedule</Button>}
    </div>
  </section>
}

export default function LockdownView({cfg,locked,lm,setLm,run}) {
  return <div className="lockv ad-admin-page ad-admin-lockdown">
    <header className="ad-admin-pagehero ad-admin-lockhero"><div><p className="ad-admin-eyebrow">ACCESS CONTROL · STUDENT SITE</p><h2>Control the doors.</h2><p>Pause reservations immediately, once, or on a repeating schedule.</p></div></header>
    <section className={'lockhero ' + (locked ? 'on' : 'off')}>
      <Icon name={locked ? 'lock' : 'unlock'} size={34} />
      <div><h2>{locked ? 'Student site is locked' : 'Student site is open'}</h2>
        <p className="small">{cfg.next_lock_change ? 'Next schedule boundary: '+siteTime(cfg.next_lock_change,cfg.tz) : 'No upcoming lock or reopen time.'}</p></div>
      <Pill tone={locked ? 'rose' : 'mint'}>{locked ? 'Locked' : 'Open'}</Pill>
    </section>
    <ManualLock cfg={cfg} locked={locked} lm={lm} run={run} />
    <section className="card stack lockdown-card">
      <Field label="Message students see"><input value={lm} onChange={e=>setLm(e.target.value)} /></Field>
      <p className="small">This message is shared by all locks. It saves when you start a lock or save a schedule.</p>
    </section>
    <OneTimeLock key={JSON.stringify([cfg.lock_from,cfg.lock_until])} cfg={cfg} lm={lm} run={run} />
    <RecurringLock key={JSON.stringify([cfg.recurring_start,cfg.recurring_end,cfg.recurring_unit,cfg.recurring_every])} cfg={cfg} lm={lm} run={run} />
  </div>
}
