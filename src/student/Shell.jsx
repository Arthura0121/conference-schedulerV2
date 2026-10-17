import Icon from '../components/Icon.jsx'
import Brand from '../components/Brand.jsx'
import SoundToggle from './SoundToggle.jsx'
const NAV = [['cal', 'Calendar', 'calendar'], ['list', 'Times', 'list']]
/** Desktop: slim vertical rail. Phone: compact top bar + bottom tab bar (thumb reach, safe-area aware). */
export function Rail({view, setView, hasBooking}) {
  return <aside className="rail"><Brand compact href="#" />
    <nav aria-label="Sections">{NAV.map(([k, l, ic]) => <button key={k} aria-pressed={view === k} aria-label={l} onClick={() => setView(k)}><Icon name={ic} /><span>{l}</span>{k === 'cal' && hasBooking && <i className="dot" aria-hidden="true" />}</button>)}</nav>
    <div className="rail-foot"><SoundToggle compact /><a href="#admin" className="tlink">Teacher<br />login</a></div></aside>
}
export function TopBar({title}) {
  return <header className="topbar"><Brand compact /><h1>{title}</h1><SoundToggle compact /></header>
}
export function BottomNav({view, setView, hasBooking}) {
  return <nav className="bnav" aria-label="Sections">{NAV.map(([k, l, ic]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}><Icon name={ic} size={22} /><span>{l}</span>{k === 'cal' && hasBooking && <i className="dot" aria-hidden="true" />}</button>)}</nav>
}
