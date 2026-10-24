import {useEffect, useState} from 'react'
import {configured, sb} from '../sb.js'
import {startVisitorPresence} from '../visitorPresence.js'
import '../styles/visitor-count.css'

/** Mounted once ABOVE route switching so it also appears during lockouts, loading and teacher sign-in. */
export default function VisitorCounter() {
 const [{status, count}, setPresence] = useState({status: 'connecting', count: null})
 useEffect(() => {
  if (!configured) { setPresence({status: 'unavailable', count: null}); return }
  const presence = startVisitorPresence({client: sb, onUpdate: setPresence})
  return () => presence.stop()
 }, [])
 const live = status === 'live' && Number.isFinite(count)
 const label = live ? (count === 1 ? 'visitor online' : 'visitors online') : 'visitors online'
 const hint = live
  ? 'Approximate live count of connected browsers, including students and teachers. Tabs in the same browser are grouped.'
  : 'The live visitor count is temporarily unavailable. It will update when the connection recovers.'
 return <div className={'visitor-counter ' + (live ? 'is-live' : 'is-waiting')} role="status" aria-live="polite" aria-atomic="true" aria-label={live ? count + ' ' + label : 'Live visitor count unavailable'} title={hint}>
  <span className="visitor-counter-dot" aria-hidden="true" />
  <span className="visitor-counter-number">{live ? count : '—'}</span>
  <span className="visitor-counter-text">{label}</span>
 </div>
}
