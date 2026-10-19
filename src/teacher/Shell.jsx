import {useState} from 'react'
import Icon from '../components/Icon.jsx'
import ThemeScene from '../components/ThemeScene.jsx'
import {safeTheme, THEMES} from '../themes.js'
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
  return <header className="ttop"><a href="#" className="teacher-top-student" aria-label="Student page"><Icon name="left" size={19}/></a><h1>{title}</h1><SoundToggle compact /><button className="btn ghost icon" aria-label="Sign out" onClick={onSignOut}><Icon name="logout" /></button></header>
}
export function TeacherBottom({tab, setTab, locked}) {
  return <nav className="bnav five" aria-label="Sections">{TABS.map(([k, l, ic]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}><Icon name={ic} size={22} /><span>{l}</span>{k === 'lock' && locked && <i className="lk on" aria-hidden="true" />}</button>)}</nav>
}

const themeTitle=theme=>THEMES.find(item=>item.id===safeTheme(theme))?.name || 'Aurora After Dark'
function TeacherAuthScene({theme, children}){
 const visual=safeTheme(theme)
 return <main className="teacher-auth" data-theme={visual}>
  <ThemeScene theme={visual}/>
  <div className="teacher-auth-layout">{children}</div>
 </main>
}
export function TeacherLoading({theme='aurora',message='Preparing your teacher workspace…',onRetry=null}){
 return <TeacherAuthScene theme={theme}>
  <section className="teacher-auth-loading" role="status" aria-live="polite">
   <Brand sub="Teacher"/>
   <span className="spin" aria-hidden="true"/>
   <h1>Opening teacher workspace</h1><p>{message}</p>
   {onRetry&&<Button type="button" variant="primary" icon="refresh" onClick={onRetry}>Retry connection</Button>}
  </section>
 </TeacherAuthScene>
}
export function SignIn({theme='aurora',em,setEm,pw,setPw,onSubmit,error,busy=false}){
 const [reveal,setReveal]=useState(false)
 return <TeacherAuthScene theme={theme}>
  <section className="teacher-auth-story" aria-label="Teacher workspace">
   <div className="teacher-auth-brand"><Brand sub="Teacher"/><span className="teacher-auth-season">{themeTitle(theme)} theme</span></div>
   <div className="teacher-auth-story-copy">
    <p className="teacher-auth-eyebrow"><Icon name="sparkle" size={16}/> Your conference command center</p>
    <h1>A calmer way to run every conference.</h1>
    <p>One place for your schedule, student bookings, and classroom availability.</p>
    <div className="teacher-auth-story-tags" aria-hidden="true"><span>Schedule</span><span>Bookings</span><span>Classroom</span></div>
   </div>
   <a href="#" className="teacher-auth-return"><Icon name="left" size={16}/> Back to student reservations</a>
  </section>
  <section className="teacher-auth-form-wrap" aria-labelledby="teacher-login-heading">
   <div className="teacher-auth-form-heading">
    <span className="teacher-auth-form-icon" aria-hidden="true"><Icon name="lock" size={20}/></span>
    <p className="teacher-auth-eyebrow">Secure staff access</p>
    <h2 id="teacher-login-heading">Welcome back.</h2>
    <p>Sign in to manage English conferences.</p>
   </div>
   <form className="teacher-auth-form" onSubmit={onSubmit} aria-busy={busy}>
    <Field label="Email address"><input type="email" name="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck="false" required autoFocus value={em} disabled={busy} onChange={e=>setEm(e.target.value)}/></Field>
    <div className="teacher-auth-password">
     <Field label="Password"><input type={reveal?'text':'password'} name="password" autoComplete="current-password" required value={pw} disabled={busy} onChange={e=>setPw(e.target.value)}/></Field>
     <button type="button" className="teacher-auth-reveal" aria-label={reveal?'Hide password':'Show password'} aria-pressed={reveal} onClick={()=>setReveal(v=>!v)}>{reveal?'Hide':'Show'}</button>
    </div>
    {error && <p className="teacher-auth-error" role="alert"><Icon name="alert" size={17}/>{error}</p>}
    <Button variant="primary" type="submit" busy={busy} disabled={!em.trim()||!pw}>{busy?'Signing in…':'Sign in to dashboard'}<Icon name="right" size={18}/></Button>
   </form>
   <p className="teacher-auth-reassurance"><Icon name="lock" size={14}/> For authorized teachers only. Student reservations remain accessible without signing in.</p>
   <a href="#" className="teacher-auth-mobile-return"><Icon name="left" size={16}/> Student reservations</a>
  </section>
 </TeacherAuthScene>
}
