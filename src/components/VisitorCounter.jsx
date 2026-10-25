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
 const label = 'viewing now'
 const hint = live
  ? 'Approximate count of browsers actively viewing this page, including students and teachers. Background tabs and unfocused windows are excluded; tabs in the same browser count once.'
  : 'The live visitor count is temporarily unavailable. It will update when the connection recovers.'
 return <div className={'visitor-counter ' + (live ? 'is-live' : 'is-waiting')} role="status" aria-live="polite" aria-atomic="true" aria-label={live ? count + ' ' + label : 'Active viewer count unavailable'} title={hint}>
  <span className="visitor-counter-dot" aria-hidden="true" />
  <span className="visitor-counter-number">{live ? count : '—'}</span>
  <span className="visitor-counter-text">{label}</span>
 </div>
}
