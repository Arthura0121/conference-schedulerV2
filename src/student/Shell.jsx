import Icon from '../components/Icon.jsx'
import SoundToggle from './SoundToggle.jsx'
import LiveBadge from '../components/Live.jsx'
const NAV = [['cal', 'Calendar', 'calendar'], ['list', 'Times', 'list']]
/** Desktop: slim vertical rail. Phone: compact top bar + bottom tab bar (thumb reach, safe-area aware). */
export function Rail({view, setView, hasBooking}) {
  return <aside className="rail" aria-label="Student controls">
    <div className="rail-dock">
      <nav aria-label="Sections">{NAV.map(([k, l, ic]) => <button key={k} aria-pressed={view === k} aria-label={l} onClick={() => setView(k)}><span className="rail-icon"><Icon name={ic} /></span><span>{l}</span>{k === 'cal' && hasBooking && <i className="dot" aria-hidden="true" />}</button>)}</nav>
      <div className="rail-sep" aria-hidden="true" />
      <div className="rail-tools"><SoundToggle compact /><a href="#admin" className="rail-teacher" aria-label="Teacher login"><Icon name="user" /><span>Teacher</span></a></div>
    </div>
  </aside>
}
export function TopBar({title, live = 'connecting'}) {
  return <header className="topbar" aria-label="Student toolbar"><h1>{title}</h1><div className="topbar-tools"><LiveBadge status={live}/><SoundToggle compact /></div></header>
}
export function BottomNav({view, setView, hasBooking}) {
  return <nav className="bnav" aria-label="Student controls">{NAV.map(([k, l, ic]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}><Icon name={ic} size={22} /><span>{l}</span>{k === 'cal' && hasBooking && <i className="dot" aria-hidden="true" />}</button>)}<a href="#admin" className="bnav-teacher" aria-label="Teacher login"><Icon name="user" size={22}/><span>Teacher</span></a></nav>
}
