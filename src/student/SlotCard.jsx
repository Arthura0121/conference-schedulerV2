import Icon from '../components/Icon.jsx'
import {Pill, Button, useGlow} from '../components/ui.jsx'
import {hm12, STATE_LABEL} from '../lib.js'

const TONE = {open: 'mint', held: 'cyan', booked: 'violet', unavailable: 'slate'}
const split = t => { const m = /^(\d+:\d\d)\s*(AM|PM)$/i.exec(t.replace(/\u202f/g, ' ')); return m ? [m[1], m[2].toUpperCase()] : [t, ''] }

export default function SlotCard({s, tz, hasBooking, busy, onPick, picked}) {
  const glow = useGlow(), [t, ap] = split(hm12(s.start_at, tz))
  const status = s.mine && s.state === 'booked' ? 'Your booking' : STATE_LABEL[s.state]
  return <li className={`slot ${s.state}${picked ? ' picked' : ''} glow`} {...glow}>
    <div className="slot-time"><b className="num">{t}</b><span>{ap}</span><small className="num">to {hm12(s.end_at, tz)}</small></div>
    <div className="slot-meta"><span className="tag"><Icon name="door" size={14} />Room {s.room}</span></div>
    <div className="slot-act">
      {s.state === 'open' && !hasBooking
        ? <Button variant="primary" size="sm" disabled={busy} onClick={() => onPick(s)} aria-label={`Reserve ${hm12(s.start_at, tz)}, room ${s.room}`}>Reserve</Button>
        : <Pill tone={s.mine ? 'violet' : TONE[s.state]}>{status}</Pill>}
    </div>
  </li>
}
