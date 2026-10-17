import {useMemo} from 'react'
import Icon from '../components/Icon.jsx'
import {Empty} from '../components/ui.jsx'
import {groupActivity} from '../activity.js'
/** Readable activity timeline: icon, title, short sentence, time, appointment details when known. Grouped by day. */
export default function ActivityTimeline({events, tz, nowMs}) {
  const groups = useMemo(() => groupActivity(events || [], tz, nowMs), [events, tz, Math.floor(nowMs / 60000)])   // eslint-disable-line
  if (!groups.length) return <Empty art={false} title="No admin activity yet">Changes you make will be listed here.</Empty>
  return <div className="act">{groups.map(g => <section key={g.date} aria-label={g.label}><h3 className="act-day">{g.label}</h3>
    <ol className="act-list">{g.items.map((e, i) => <li key={e.id ?? g.date + i} className={'act-item ' + e.tone}>
      <span className="act-ic" aria-hidden="true"><Icon name={e.icon} size={18} /></span>
      <div className="act-body"><div className="act-top"><b>{e.title}</b><time className="small num" dateTime={e.happened_at}>{e.time}</time></div>
        <p>{e.text}</p>{e.detail && <p className="small act-detail">{e.detail}</p>}</div></li>)}</ol></section>)}</div>
}
