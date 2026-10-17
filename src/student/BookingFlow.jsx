import {useState} from 'react'
import Icon from '../components/Icon.jsx'
import {Button, Field} from '../components/ui.jsx'
import {hm12, dateLabel, ymd, validText} from '../lib.js'
import {CONSENT_LABEL} from '../roster.js'

const R = 22, C = 2 * Math.PI * R
/** 15-second hold shown as a draining ring. role=timer (not a live region): screen readers get one polite warning at 5 s instead of every tick. */
export function HoldTimer({left}) {
  const low = left <= 5, progress = Math.max(0, Math.min(100, left / 15 * 100))
  return <div className={'hold ad-hold' + (low ? ' low' : '')} style={{'--hold-progress': progress + '%'}}>
    <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r={R} className="trk" /><circle cx="30" cy="30" r={R} className="bar" style={{strokeDasharray: C, strokeDashoffset: C * (1 - Math.max(0, Math.min(15, left)) / 15)}} /></svg>
    <div className="ad-hold-copy" role="timer"><span className="hold-l">YOUR PRIVATE RESERVATION WINDOW</span><b className="num">{left}<span className="ad-sec"> sec</span></b><small>{low ? "Almost out of time — confirm now" : "This appointment is reserved temporarily for you"}</small></div>
    <span className="ad-hold-track" aria-hidden="true"><i /></span>
    <span className="vh" role="status">{left === 5 ? 'Five seconds left on your hold.' : ''}</span>
  </div>
}

export default function BookingFlow({sel, tz, left, name, setName, asg, setAsg, consent = false, setConsent = () => {}, busy, onSubmit, onRelease}) {
  const [tried, setTried] = useState(false)
  const nameBad = tried && !validText(name, 80), asgBad = tried && !validText(asg, 200)
  const submit = e => { e.preventDefault(); setTried(true); if (!validText(name, 80) || !validText(asg, 200)) return; onSubmit() }
  return <form className="flow ad-booking" onSubmit={submit} noValidate>
    <header className="ad-booking-head"><p className="ad-day-kicker"><span className="ad-spark" aria-hidden="true"/> FINAL STEP · YOUR DETAILS</p><h2>Make it official.</h2><p>{dateLabel(ymd(sel.start_at, tz))} · Confirm before your hold runs out.</p></header>
    <div className="ticket ad-booking-ticket"><div className="tk-time"><b className="num">{hm12(sel.start_at, tz)}</b><span className="num">to {hm12(sel.end_at, tz)}</span></div>
      <div className="tk-meta"><span className="tag"><Icon name="door" size={14} />Room {sel.room}</span><span className="tag">Period {sel.period}</span></div></div>
    <HoldTimer left={left} />
    <Field label="Your full name" error={nameBad && 'Please type your name.'}><input required maxLength={80} autoComplete="name" autoFocus value={name} aria-invalid={nameBad || undefined} onChange={e => setName(e.target.value)} /></Field>
    <Field label="Writing piece you will revise" hint="For example: Essay 2, first draft" error={asgBad && 'Please say which piece of writing you will bring.'}><input required maxLength={200} enterKeyHint="done" value={asg} aria-invalid={asgBad || undefined} onChange={e => setAsg(e.target.value)} /></Field>
    <label className="chk consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>{CONSENT_LABEL}<small className="hint"> Optional. You can book without it and change your mind later.</small></span></label>
    <div className="sheet-foot flow-foot"><Button type="button" onClick={onRelease}>Release</Button><Button type="submit" variant="primary" busy={busy}>{busy ? 'Saving…' : 'Confirm reservation'}</Button></div>
  </form>
}
