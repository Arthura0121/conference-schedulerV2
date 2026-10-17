import {rosterGroups, HIDDEN_LABEL} from '../roster.js'
import {hm12, dateLabel} from '../lib.js'
import Icon from '../components/Icon.jsx'
/** Class roster shown ONLY when the teacher switched it on. The server already withheld every name without consent, so nothing is hidden by CSS here. */
export default function Roster({rows, tz}) {
  const groups = rosterGroups(rows, tz)
  return <section className="card roster ad-student-roster" aria-labelledby="roster-h"><h2 id="roster-h">Class conference roster</h2>
    <p className="small">Names appear only for classmates who chose to show them. Everyone else is listed as &ldquo;{HIDDEN_LABEL}&rdquo;.</p>
    {!groups.length ? <p className="small">No upcoming reservations yet.</p> : groups.map(g => <div key={g.date} className="rgroup"><h3>{dateLabel(g.date)}</h3>
      <ul className="rlist">{g.items.map((r, i) => <li key={i}><span className="num">{hm12(r.start_at, tz)}</span><span className="tag"><Icon name="door" size={14} />{r.room}</span><span className="tag">Period {r.period}</span>
        <span className={'rname' + (r.display_name && !r.name_hidden ? '' : ' hid')}>{r.label}</span></li>)}</ul></div>)}</section>
}
