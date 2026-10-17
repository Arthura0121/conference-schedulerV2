import {useRef} from 'react'
import Icon from '../components/Icon.jsx'
import {monthGrid, dayState, dateLabel} from '../lib.js'

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], WEEKFULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CAP = {available: 'open', partial: 'open', full: 'full', unavailable: 'closed'}
const DOT = {open: 'o', held: 'h', booked: 'b', unavailable: 'u'}

export const monthLabel = (y, m) => new Date(Date.UTC(y, m, 1)).toLocaleString('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'})

/** The centerpiece: a month grid where every day shows one tiny ribbon per appointment (shape + color + count text, never color alone). */
export default function MonthCalendar({groups, month, setMonth, date, onPick, today, dir, setDir}) {
  const [y, m] = month, grid = useRef()
  const go = d => { const x = new Date(Date.UTC(y, m + d, 1)); setDir(d); setMonth([x.getUTCFullYear(), x.getUTCMonth()]) }
  const jumpToday = () => { const [ty, tm] = today.split('-').map(Number); setDir(ty * 12 + tm - 1 > y * 12 + m ? 1 : -1); setMonth([ty, tm - 1]) }
  const cells = monthGrid(y, m).flat()
  const openThisMonth = cells.reduce((n, d) => n + (d && groups[d] ? Object.values(groups[d]).flat().filter(s => s.state === 'open').length : 0), 0)
  // Roving arrow-key movement between available days.
  const onKey = e => {
    const k = {ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7}[e.key]; if (!k) return
    const btns = [...grid.current.querySelectorAll('button.day')], i = btns.indexOf(document.activeElement); if (i < 0) return
    const n = btns[i + k]; if (n) { e.preventDefault(); n.focus() }
  }
  return <section className="cal" aria-label="Calendar">
    <header className="cal-head">
      <div><h2 className="cal-title" key={y + '-' + m} style={{animation: 'rise var(--med) var(--ease-out)'}}>{monthLabel(y, m)}</h2>
        <p className="small" aria-live="polite">{openThisMonth ? `${openThisMonth} open ${openThisMonth === 1 ? 'time' : 'times'} this month` : 'No open times this month'}</p></div>
      <div className="row"><button className="btn ghost sm" onClick={jumpToday}>Today</button>
        <button className="btn icon" onClick={() => go(-1)} aria-label="Previous month"><Icon name="left" /></button>
        <button className="btn icon" onClick={() => go(1)} aria-label="Next month"><Icon name="right" /></button></div>
    </header>
    <div className="dow" aria-hidden="true">{WEEK.map((d, i) => <span key={i}>{d}</span>)}</div>
    <div className="days" ref={grid} key={y + '-' + m} data-dir={dir} role="group" aria-label={`Days of ${monthLabel(y, m)}`} onKeyDown={onKey}>
      {cells.map((d, i) => {
        if (!d) return <span key={i} className="day empty" />
        const list = groups[d] ? Object.values(groups[d]).flat() : [], st = dayState(list), n = list.filter(s => s.state === 'open').length
        const dow = WEEKFULL[new Date(d + 'T12:00:00Z').getUTCDay()]
        return <button key={i} className={`day ${st}${d === date ? ' sel' : ''}${d === today ? ' today' : ''}`} disabled={st === 'none'} aria-pressed={d === date} aria-current={d === today ? 'date' : undefined}
          onClick={() => onPick(d)} aria-label={`${dateLabel(d)}: ${st === 'none' ? 'no conferences' : n + ' open'}`} title={dow}>
          <b>{+d.slice(8)}</b>
          {st !== 'none' && <>
            <span className="ribbons" aria-hidden="true">{list.slice(0, 12).map(s => <i key={s.id} className={DOT[s.state]} />)}</span>
            <small>{st === 'available' || st === 'partial' ? `${n} open` : CAP[st]}</small></>}
        </button>
      })}
    </div>
    <ul className="legend" aria-label="Legend"><li><i className="o" aria-hidden="true" />Open</li><li><i className="h" aria-hidden="true" />Held</li><li><i className="b" aria-hidden="true" />Booked</li><li><i className="u" aria-hidden="true" />Unavailable</li></ul>
  </section>
}
