import {useState} from 'react'
import SlotCard from './SlotCard.jsx'
import {Empty} from '../components/ui.jsx'
import {dateLabel} from '../lib.js'
export default function ListView({groups, tz, hasBooking, busy, onPick}) {
  const [onlyOpen, setOnlyOpen] = useState(true)
  const days = Object.keys(groups).map(d => [d, Object.entries(groups[d]).map(([p, ss]) => [p, onlyOpen ? ss.filter(s => s.state === 'open') : [...ss].sort((a,b) => (a.state === 'open' ? -1 : 1) - (b.state === 'open' ? -1 : 1) || new Date(a.start_at) - new Date(b.start_at))]).filter(([, ss]) => ss.length)]).filter(([, ps]) => ps.length)
  return <section className="listv ad-student-list" aria-label="All times">
    <header className="list-head ad-list-hero"><div><p className="ad-day-kicker">EVERY OPENING · ONE PLACE</p><h2>Your times, at a glance.</h2><p>Browse the full schedule, one day at a time.</p></div><button className="btn sm" aria-pressed={onlyOpen} onClick={() => setOnlyOpen(v => !v)}>{onlyOpen ? 'Open only' : 'Show open only'}</button></header>
    {!days.length ? <Empty title={onlyOpen ? 'No open times right now' : 'No conference times posted yet'}>{onlyOpen ? 'Everything posted is booked or unavailable. New times appear here automatically.' : 'Check back soon.'}</Empty>
      : days.map(([d, ps]) => <section key={d} className="listday"><h3 className="daystick">{dateLabel(d)}</h3>
        {ps.map(([p, ss]) => <div key={p}><h4 className="pl">Period {p}</h4><ul className="slots">{ss.map(s => <SlotCard key={s.id} s={s} tz={tz} hasBooking={hasBooking} busy={busy} onPick={onPick} />)}</ul></div>)}</section>)}
  </section>
}
