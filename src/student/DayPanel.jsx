import SlotCard from './SlotCard.jsx'
import Icon from '../components/Icon.jsx'
import {Button, Empty} from '../components/ui.jsx'
import {dateLabel, hm12} from '../lib.js'

/** Detail panel for one day: slots grouped by period. Desktop shows it beside the calendar, phones show it in a bottom sheet. */
export default function DayPanel({date, groups, tz, hasBooking, busy, onPick, expired, onRetry}) {
  const day = groups[date] || {}, periods = Object.entries(day), all = periods.flatMap(([, s]) => s), open = all.filter(s => s.state === 'open').length
  const retry = expired && all.find(s => s.id === expired.id && s.state === 'open')
  return <div className="panel-day" key={date}>
    <header className="panel-head"><div><h3>Selected day</h3><h2>{dateLabel(date)}</h2></div>
      <span className={'count ' + (open ? 'yes' : 'no')}><b className="num">{open}</b> open</span></header>
    <div className="ribbon" aria-hidden="true" />
    {expired && <div className="banner" role="status"><Icon name="clock" /><span>Your 60-second hold on {hm12(expired.start_at, tz)} ended.</span>{retry && <Button size="sm" onClick={() => onRetry(retry)}>Reserve again</Button>}</div>}
    {hasBooking && <div className="banner info" role="note"><Icon name="info" /><span>You already have a conference. Cancel it first to pick a different time.</span></div>}
    {!periods.length ? <Empty title="Nothing posted for this day">Pick a highlighted day on the calendar.</Empty>
      : periods.map(([p, ss], i) => <section key={p} className="period" style={{'--i': i}}><h3>Period {p}</h3>
        <ul className="slots">{ss.map(s => <SlotCard key={s.id} s={s} tz={tz} hasBooking={hasBooking} busy={busy} onPick={onPick} />)}</ul></section>)}
    {periods.length > 0 && open === 0 && <p className="small note-closed">Nothing is open on this day. Unavailable times are not bookable online.</p>}
  </div>
}
