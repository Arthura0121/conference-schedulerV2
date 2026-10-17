import Icon from '../components/Icon.jsx'
import {Button} from '../components/ui.jsx'
import {buildIcs} from '../ics.js'

const PIECES = Array.from({length: 18}, (_, i) => ({x: Math.round(Math.cos(i * 2.4) * (60 + (i % 5) * 22)), y: Math.round(-30 - (i % 6) * 22 - Math.abs(Math.sin(i)) * 40), r: (i * 47) % 360, c: ['#8B5CF6', '#22D3EE', '#34D399', '#FBBF24', '#818CF8'][i % 5], d: (i % 6) * 40}))
export function download(done) {
  if (!done.raw) return
  const url = URL.createObjectURL(new Blob([buildIcs(done.raw)], {type: 'text/calendar'})), a = document.createElement('a')
  a.href = url; a.download = 'english-conference.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
/** Shown only after the server confirmed the booking. Celebration is CSS-only (transform + opacity), short, and switched off by reduced-motion. */
export default function Success({done, onDone}) {
  return <div className="success ad-success" role="status"><div className="ad-success-halo" aria-hidden="true"><i/><i/><i/></div>
    <div className="burst" aria-hidden="true">{PIECES.map((p, i) => <i key={i} style={{'--x': p.x + 'px', '--y': p.y + 'px', '--r': p.r + 'deg', background: p.c, animationDelay: p.d + 'ms'}} />)}</div>
    <svg className="check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
    <p className="ad-success-eyebrow">RESERVATION CONFIRMED</p><h2>You're booked!</h2><p className="ad-success-intro">Your writing conference is on the calendar.</p>
    <div className="ticket big ad-confirmed-ticket"><div className="tk-time"><b>{done.t}</b></div><p className="tk-day">{done.d}</p>
      <div className="tk-meta"><span className="tag">Period {done.p}</span><span className="tag"><Icon name="door" size={14} />Room {done.room}</span></div></div>
    <p className="small">You can cancel up to 24 hours before your conference; after that, please ask your teacher.</p>
    <div className="row" style={{justifyContent: 'center'}}>{done.raw && <Button icon="download" onClick={() => download(done)}>Add to calendar</Button>}<Button variant="primary" onClick={onDone}>Dismiss</Button></div>
  </div>
}
