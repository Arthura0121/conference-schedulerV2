import Icon from '../components/Icon.jsx'
import Brand from '../components/Brand.jsx'
import SoundToggle from '../student/SoundToggle.jsx'
import {Button, Field} from '../components/ui.jsx'
import {VersionTag} from '../components/About.jsx'
export const TABS = [['dash', 'Overview', 'grid'], ['sched', 'Schedule', 'calendar'], ['book', 'Bookings', 'user'], ['set', 'Settings', 'sliders'], ['lock', 'Lockdown', 'lock']]
export function TeacherRail({tab, setTab, locked, onSignOut, onWhatsNew}) {
  return <aside className="trail" aria-label="Teacher controls">
    <div className="trail-dock">
      <nav aria-label="Sections">{TABS.map(([k, l, ic]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}><span className="trail-icon"><Icon name={ic} /></span><span>{l}</span>{k === 'lock' && <i className={'lk ' + (locked ? 'on' : 'off')} aria-hidden="true" />}</button>)}</nav>
      <div className="trail-sep" aria-hidden="true" />
      <div className="trail-tools">
        <SoundToggle compact />
        <a href="#" className="trail-action" aria-label="Student page"><span aria-hidden="true">←</span><span>Student</span></a>
        <button type="button" className="trail-action" onClick={onSignOut} aria-label="Sign out"><Icon name="logout" /><span>Sign out</span></button>
        <button type="button" className="trail-version" onClick={onWhatsNew} aria-label="Open What's new"><VersionTag /></button>
      </div>
    </div>
  </aside>
}
export function TeacherTop({title, onSignOut}) {
  return <header className="ttop"><span className="ttop-balance" aria-hidden="true" /><h1>{title}</h1><SoundToggle compact /><button className="btn ghost icon" aria-label="Sign out" onClick={onSignOut}><Icon name="logout" /></button></header>
}
export function TeacherBottom({tab, setTab, locked}) {
  return <nav className="bnav five" aria-label="Sections">{TABS.map(([k, l, ic]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}><Icon name={ic} size={22} /><span>{l}</span>{k === 'lock' && locked && <i className="lk on" aria-hidden="true" />}</button>)}</nav>
}
export function SignIn({em, setEm, pw, setPw, onSubmit, error}) {
  return <main className="center-screen signin"><form className="card stack" onSubmit={onSubmit}>
    <Brand sub="Teacher" /><div className="ribbon" aria-hidden="true" /><h1>Teacher sign-in</h1>
    <Field label="Email"><input type="email" autoComplete="username" value={em} onChange={e => setEm(e.target.value)} /></Field>
    <Field label="Password" error={error}><input type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} /></Field>
    <Button variant="primary" type="submit">Sign in</Button>
    <p className="small">Only accounts added with make_admin.sql can use this page.</p><a href="#">← Student page</a></form></main>
}
