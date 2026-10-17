import Icon from '../components/Icon.jsx'
import {sound} from '../sound.js'
import {Button} from '../components/ui.jsx'
import {dateLabel, ymd, hm12, canCancel} from '../lib.js'
import {CONSENT_LABEL} from '../roster.js'
export default function MyBooking({mine, tz, onCancel, onConsent, rosterOn = false, now = Date.now()}) {
  const ok = canCancel(new Date(mine.start_at).getTime(), now)
  return <section className="mine card ad-mybooking" aria-label="Your conference">
    <div className="mine-top"><span className="pill violet">Confirmed conference</span></div><p className="ad-mybooking-kicker">YOUR RESERVED MOMENT</p>
    <h3 className="mine-when">{dateLabel(ymd(mine.start_at, tz))}</h3>
    <p className="mine-line"><Icon name="clock" size={16} /><b className="num">{hm12(mine.start_at, tz)}</b><span>· Period {mine.period}</span><Icon name="door" size={16} /><span>Room {mine.room}</span></p>
    {onConsent && 'roster_consent' in mine && <label className="chk consent"><input type="checkbox" checked={Boolean(mine.roster_consent)} onChange={e => {sound.play('select');onConsent(e.target.checked)}} /><span>{CONSENT_LABEL}<small className="hint">{rosterOn ? (mine.roster_visible ? ' Your name is currently shown on the roster.' : ' The roster is on, but your name is not shown.') : ' The class roster is currently off, so no names are shown.'}</small></span></label>}
    {ok ? <Button variant="danger" size="sm" onClick={onCancel}>Cancel conference</Button>
      : <p className="small">It is within 24 hours, so it can only be changed by your teacher.</p>}
  </section>
}
