import {useState} from 'react'
import SlotCard from './SlotCard.jsx'
import Icon from '../components/Icon.jsx'
import {Button, Empty} from '../components/ui.jsx'
import {dateLabel, hm12} from '../lib.js'

/** After Dark: the day is a destination, with a live availability overview and
 * distinct period decks. This remains the same server-authoritative booking flow. */
export default function DayPanel({date, groups, tz, hasBooking, busy, onPick, expired, onRetry}) {
  const [showClosed, setShowClosed] = useState(false)
  const day = groups[date] || {}, periods = Object.entries(day), all = periods.flatMap(([, s]) => s)
  const open = all.filter(s => s.state === 'open').length
  const booked = all.filter(s => s.state === 'booked').length
  const retry = expired && all.find(s => s.id === expired.id && s.state === 'open')
  return <div className="panel-day ad-panel-day" key={date}>
    <header className="ad-day-hero">
      <div className="ad-day-hero-aura" aria-hidden="true" />
      <p className="ad-day-kicker"><span className="ad-spark" aria-hidden="true" /> YOUR CONFERENCE DAY</p>
      <h2>{dateLabel(date)}</h2>
      <p className="ad-day-hint">Explore the times below. Find the one that fits.</p>
      <div className="ad-day-metrics" aria-label="Appointments summary">
        <span><strong className="num">{open}</strong><small>Open now</small></span>
        <span><strong className="num">{all.length}</strong><small>Total times</small></span>
        <span><strong className="num">{booked}</strong><small>Booked</small></span>
      </div>
      <span className={'ad-day-status'+(open?' open':'')} role="status">{open?'● Times available':'● No openings right now'}</span>
    </header>
    {expired && <div className="banner" role="status"><Icon name="clock" /><span>Your 15-second hold on {hm12(expired.start_at, tz)} ended.</span>{retry && <Button size="sm" onClick={() => onRetry(retry)}>Reserve again</Button>}</div>}
    {hasBooking && <div className="banner info" role="note"><Icon name="info" /><span>You already have a conference. Cancel it first to pick a different time.</span></div>}
    {!periods.length ? <Empty title="Nothing posted for this day">Pick a highlighted day on the calendar.</Empty>
      : <>
        {open > 0 && all.length > open && <div className="ad-day-filter"><Button size="sm" aria-pressed={showClosed} onClick={() => setShowClosed(v => !v)}>{showClosed ? 'Hide unavailable times' : `Show ${all.length - open} unavailable/taken`}</Button></div>}
        {periods.map(([p, ss], i) => {
        const ordered = [...ss].sort((a,b) => (a.state === 'open' ? -1 : 1) - (b.state === 'open' ? -1 : 1) || new Date(a.start_at) - new Date(b.start_at))
        const visible = showClosed || open === 0 ? ordered : ordered.filter(s => s.state === 'open')
        const count = ss.filter(s => s.state === 'open').length
        if (!visible.length) return null
        return <section key={p} className="period ad-period" style={{'--i': i}} aria-label={'Period '+p}>
          <header className="ad-period-heading">
            <div className="ad-period-number"><span>PERIOD</span><strong>{p}</strong></div>
            <div className="ad-period-copy"><h3>Conference times</h3><p>{count ? count+' available '+(count===1?'opening':'openings') : 'All times currently taken or closed'}</p></div>
            <span className={'ad-period-count'+(count?' active':'')}>{count} OPEN</span>
          </header>
          <ul className="slots ad-slot-list">{visible.map(s => <SlotCard key={s.id} s={s} tz={tz} hasBooking={hasBooking} busy={busy} onPick={onPick} />)}</ul>
        </section>
      })}</>}
    {periods.length > 0 && open === 0 && <p className="small note-closed">Nothing is open on this day. Unavailable times are not bookable online.</p>}
  </div>
}
