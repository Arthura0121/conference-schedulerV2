import {useEffect, useState} from 'react'
import Icon from '../components/Icon.jsx'
import {Button} from '../components/ui.jsx'
import {reducedMotion} from '../components/ui.jsx'
import ActivityTimeline from './ActivityTimeline.jsx'

function useCountUp(v, ms = 650) {
  const [n, setN] = useState(reducedMotion() ? v : 0)
  useEffect(() => {
    if (reducedMotion() || typeof v !== 'number') return setN(v)
    let raf, t0
    const step = t => { t0 ??= t; const p = Math.min(1, (t - t0) / ms); setN(Math.round(v * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf)
  }, [v, ms])
  return n
}
function Kpi({label, value, tone, hint}) {
  const n = useCountUp(value)
  return <div className={'kpi ' + tone}><span className="kpi-l">{label}</span><b className="num">{n}</b><small>{hint}</small></div>
}
const SEG = [['open', 'Open', 'var(--mint)'], ['booked', 'Booked', 'var(--violet)'], ['held', 'Held now', 'var(--cyan)'], ['unavailable', 'Unavailable or paper', 'var(--slate)'], ['drafts', 'Drafts', 'var(--peri)']]
export default function Overview({stats, events, cfg, tz = 'America/New_York', nowMs = Date.now(), setTab}) {
  const [rushBase, setRushBase] = useState(null)
  if (!stats) return <div className="skel" style={{height: 260}} aria-hidden="true" />
  const now = new Date(nowMs), total = Math.max(1, stats.total), locked = cfg && (cfg.locked || (cfg.lock_from && new Date(cfg.lock_from) <= now && (!cfg.lock_until || new Date(cfg.lock_until) > now)))
  const heads = []
  if (stats.upcoming_open === 0) heads.push(['alert', 'No upcoming open times. Students cannot book anything right now. Slots imported from the paper sheets stay closed until you open them in Schedule.', 'sched', 'Open Schedule'])
  if (stats.drafts > 0) heads.push(['paper', `${stats.drafts} draft ${stats.drafts === 1 ? 'slot is' : 'slots are'} hidden from students until you publish.`, 'sched', 'Review drafts'])
  if (stats.held > 0) heads.push(['clock', `${stats.held} ${stats.held === 1 ? 'student is' : 'students are'} booking right now (15-second hold).`])
  return <div className="ov ad-admin-page ad-teacher-overview">
    <section className="ad-command-hero" aria-label="Teacher command center">
      <div className="ad-command-orbit" aria-hidden="true"><i/><i/><i/></div>
      <div className="ad-command-body">
        <p className="ad-command-kicker"><span className="ad-command-spark"/> TEACHER COMMAND CENTER</p>
        <h2>Everything, <em>in view.</em></h2>
        <p>Manage conference openings, follow student bookings, and keep the schedule running smoothly.</p>
        <div className="ad-command-actions">
          <Button variant="primary" icon="calendar" onClick={() => setTab('sched')}>Manage schedule</Button>
          <Button icon="user" onClick={() => setTab('book')}>View bookings</Button>
          <Button icon="sparkle" aria-pressed={rushBase !== null} onClick={() => setRushBase(rushBase === null ? stats.upcoming_booked : null)}>{rushBase === null ? 'Start Rush Mode' : 'End Rush Mode'}</Button>
        </div>
      </div>
      <div className="ad-command-spotlight" aria-label={stats.upcoming_open+' upcoming openings'}>
        <span>READY TO BOOK</span>
        <strong className="num">{stats.upcoming_open}</strong>
        <small>upcoming open times</small>
        <i aria-hidden="true"/>
      </div>
    </section>
    {rushBase !== null && <section className="ad-rush-mode" aria-live="polite">
      <div className="ad-rush-title"><span className="ad-command-spark" aria-hidden="true"/><div><span>RUSH MODE · LIVE</span><h2>{stats.upcoming_open > 0 ? 'Students are booking now.' : 'The open pool is empty.'}</h2></div></div>
      <div className="ad-rush-grid">
        <div><strong className="num">{stats.upcoming_open}</strong><span>open now</span></div>
        <div><strong className="num">{stats.held}</strong><span>being held</span></div>
        <div><strong className="num">{stats.upcoming_booked}</strong><span>booked upcoming</span></div>
        <div><strong className="num">{Math.max(0, stats.upcoming_booked - rushBase)}</strong><span>net booked since Rush Mode started</span></div>
      </div>
      <p className="small">These are live schedule totals from the database. Live totals include booked appointments, not the number of students viewing the page.</p>
    </section>}
    <div className="ad-command-section-title"><div><span className="ad-command-eyebrow">LIVE SNAPSHOT</span><h2>The numbers</h2></div><small>Updates with the dashboard</small></div>
    <div className="kpis"><Kpi label="Upcoming open" value={stats.upcoming_open} tone="mint" hint="students can reserve" /><Kpi label="Upcoming booked" value={stats.upcoming_booked} tone="violet" hint="on the website" />
      <Kpi label="Held now" value={stats.held} tone="cyan" hint="15-second holds" /><Kpi label="Bookings, 7 days" value={stats.bookings_7d} tone="peri" hint="made this week" /></div>
    <section className="card ad-command-distribution"><div className="row"><div><span className="ad-command-eyebrow">SCHEDULE HEALTH</span><h2>All {stats.total} slots</h2></div><span className="small">including past ones</span></div>
      <div className="comp" role="img" aria-label={SEG.map(([k, l]) => `${l}: ${stats[k]}`).join(', ')}>{SEG.map(([k, , c]) => stats[k] > 0 && <i key={k} style={{flexGrow: stats[k] / total, background: c}} />)}</div>
      <ul className="legend lg">{SEG.map(([k, l, c]) => <li key={k}><i style={{background: c}} aria-hidden="true" /><b className="num">{stats[k]}</b> {l}</li>)}</ul></section>
    <div className="ovcols">
      <section className="card ad-command-status"><div className="row"><h2>Student site</h2><span className="spacer" /><span className={'pill ' + (locked ? 'rose' : 'mint')}>{locked ? 'Locked' : 'Open'}</span></div>
        <p className="small">{locked ? 'Students currently see your lock message.' : 'Students can browse and book.'}{cfg?.edit_lock_until && new Date(cfg.edit_lock_until) > now ? ' An editing lock is active.' : ''}</p><Button size="sm" icon="lock" onClick={() => setTab('lock')}>Lockdown controls</Button></section>
      <section className="card ad-command-alerts"><h2>Needs attention</h2>{!heads.length ? <p className="small">Nothing needs attention.</p> : <ul className="heads">{heads.map(([ic, t, tab, l], i) => <li key={i}><Icon name={ic} /><span>{t}</span>{tab && <Button size="sm" onClick={() => setTab(tab)}>{l}</Button>}</li>)}</ul>}</section>
    </div>
    <section className="card ad-command-activity"><div className="ad-command-section-title"><div><span className="ad-command-eyebrow">AUDIT TRAIL</span><h2>Recent activity</h2></div><small>Readable updates</small></div><ActivityTimeline events={events} tz={tz} nowMs={nowMs} /></section>
  </div>
}
