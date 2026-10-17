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
  if (!stats) return <div className="skel" style={{height: 260}} aria-hidden="true" />
  const total = Math.max(1, stats.total), locked = cfg && (cfg.locked || (cfg.lock_from && new Date(cfg.lock_from) <= new Date() && (!cfg.lock_until || new Date(cfg.lock_until) > new Date())))
  const heads = []
  if (stats.upcoming_open === 0) heads.push(['alert', 'No upcoming open times. Students cannot book anything right now. Slots imported from the paper sheets stay closed until you open them in Schedule.', 'sched', 'Open Schedule'])
  if (stats.drafts > 0) heads.push(['paper', `${stats.drafts} draft ${stats.drafts === 1 ? 'slot is' : 'slots are'} hidden from students until you publish.`, 'sched', 'Review drafts'])
  if (stats.held > 0) heads.push(['clock', `${stats.held} ${stats.held === 1 ? 'student is' : 'students are'} booking right now (60-second hold).`])
  return <div className="ov">
    <div className="kpis"><Kpi label="Upcoming open" value={stats.upcoming_open} tone="mint" hint="students can reserve" /><Kpi label="Upcoming booked" value={stats.upcoming_booked} tone="violet" hint="on the website" />
      <Kpi label="Held now" value={stats.held} tone="cyan" hint="60-second holds" /><Kpi label="Bookings, 7 days" value={stats.bookings_7d} tone="peri" hint="made this week" /></div>
    <section className="card"><div className="row"><h2>All {stats.total} slots</h2><span className="small">including past ones</span></div>
      <div className="comp" role="img" aria-label={SEG.map(([k, l]) => `${l}: ${stats[k]}`).join(', ')}>{SEG.map(([k, , c]) => stats[k] > 0 && <i key={k} style={{flexGrow: stats[k] / total, background: c}} />)}</div>
      <ul className="legend lg">{SEG.map(([k, l, c]) => <li key={k}><i style={{background: c}} aria-hidden="true" /><b className="num">{stats[k]}</b> {l}</li>)}</ul></section>
    <div className="ovcols">
      <section className="card"><div className="row"><h2>Student site</h2><span className="spacer" /><span className={'pill ' + (locked ? 'rose' : 'mint')}>{locked ? 'Locked' : 'Open'}</span></div>
        <p className="small">{locked ? 'Students currently see your lock message.' : 'Students can browse and book.'}{cfg?.edit_lock_until && new Date(cfg.edit_lock_until) > new Date() ? ' An editing lock is active.' : ''}</p><Button size="sm" icon="lock" onClick={() => setTab('lock')}>Lockdown controls</Button></section>
      <section className="card"><h2>Heads up</h2>{!heads.length ? <p className="small">Nothing needs attention.</p> : <ul className="heads">{heads.map(([ic, t, tab, l], i) => <li key={i}><Icon name={ic} /><span>{t}</span>{tab && <Button size="sm" onClick={() => setTab(tab)}>{l}</Button>}</li>)}</ul>}</section>
    </div>
    <section className="card"><h2>Recent activity</h2><ActivityTimeline events={events} tz={tz} nowMs={nowMs} /></section>
  </div>
}
