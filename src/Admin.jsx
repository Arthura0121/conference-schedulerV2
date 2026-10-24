import {useEffect, useState, useCallback, useRef} from 'react'
import {sb, call} from './sb'
import {friendly} from './lib.js'
import {makeLatest, ADMIN_POLL_MS} from './poll.js'
import {startRealtime, nextCheckMs, TOPIC_ADMIN} from './realtime.js'
import LiveBadge from './components/Live.jsx'
import {WhatsNew} from './components/About.jsx'
import {loadTab, isAuthError, formKey} from './adminData.js'
import {rangePreset} from './slotInfo.js'
import {Button, useToast, useConfirm, useMedia} from './components/ui.jsx'
import Icon from './components/Icon.jsx'
import ThemeScene from './components/ThemeScene.jsx'
import {sound} from './sound.js'
import {TeacherRail, TeacherTop, TeacherBottom, SignIn, TeacherLoading, TABS} from './teacher/Shell.jsx'
import Overview from './teacher/Overview.jsx'
import Schedule from './teacher/Schedule.jsx'
import Bookings from './teacher/Bookings.jsx'
import SettingsView from './teacher/SettingsView.jsx'
import LockdownView from './teacher/LockdownView.jsx'
import './styles/ui.css'
import './styles/teacher.css'
import './styles/liquid-glass.css'
import './styles/themes.css'
import './styles/seasonal-components.css'
import './styles/app-completion.css'
import './styles/mobile-polish.css'
import {safeTheme, applySiteTheme, rememberedTheme} from './themes.js'

export default function Admin() {
 const [ok, setOk] = useState(null), [tab, setTab] = useState('dash'), [em, setEm] = useState(''), [pw, setPw] = useState(''), [loginErr, setLoginErr] = useState(''), [signingIn, setSigningIn] = useState(false), [publicTheme, setPublicTheme] = useState(rememberedTheme)
 const [stats, setStats] = useState(null), [ev, setEv] = useState([]), [cfg, setCfg] = useState(null), [slots, setSlots] = useState([]), [books, setBooks] = useState([])
 const [range, setRange] = useState(() => rangePreset('upcoming', 'America/New_York')), from = range.from, to = range.to
 const [lm, setLm] = useState(''), [lf, setLf] = useState(''), [lu, setLu] = useState(''), [pol, setPol] = useState(''), [auto, setAuto] = useState(false), [tzv, setTzv] = useState('')
 const tz = cfg?.tz || 'America/New_York', toast = useToast(), confirm = useConfirm(), wide = useMedia('(min-width: 1000px)')
 const [wn, setWn] = useState(false), lv = useRef(null), rf = useRef(null), [live, setLive] = useState('connecting'), latest = useRef(makeLatest()), [stale, setStale] = useState(''), [updated, setUpdated] = useState(null), [now, setNow] = useState(Date.now())
 const refresh = useCallback(async()=>{const id=latest.current.next()
  try{const a=await call('admin_check');if(!latest.current.isLatest(id))return
   if(!a){setOk(false);return}
   const d=await loadTab(tab,{from,to},call);if(!latest.current.isLatest(id))return
   setOk(true);if(d.stats)setStats(d.stats);if(d.events)setEv(d.events);if(d.cfg)setCfg(d.cfg);if(d.slots)setSlots(d.slots);if(d.books)setBooks(d.books)
   setStale('');setUpdated(new Date());setNow(Date.now())}
  catch(e){if(!latest.current.isLatest(id))return;if(isAuthError(e))setOk(false);else setStale('Connection problem: showing the last data received. Retrying automatically…')}},[tab,from,to])
 rf.current = refresh
 // First load and every tab / date-range change: fetch immediately.
 useEffect(()=>{refresh()},[refresh])
 useEffect(()=>{applySiteTheme(cfg?.theme || publicTheme)},[cfg?.theme,publicTheme])
 // The sign-in screen cannot read private teacher settings; use the public site theme instead.
 // Last-seen appearance is shown immediately and replaced by server state when available.
 useEffect(()=>{
  let active=true
  call('public_state').then(state=>{
   if(active && state?.theme) setPublicTheme(safeTheme(state.theme))
  }).catch(()=>{})
  return()=>{active=false}
 },[])
 // Live updates: once signed in as a teacher, open the private admin channel. A signal only triggers a refetch; polling is the fallback (5 s) and a slow safety check (30 s).
 useEffect(()=>{if(ok!==true)return;const h=startRealtime({client:sb,topic:TOPIC_ADMIN,refresh:()=>rf.current(),onStatus:setLive,fallbackMs:ADMIN_POLL_MS,reconcileMs:30000});lv.current=h;return()=>{h.stop();lv.current=null}},[ok===true])
 // Time-based changes (scheduled lockdown start/end, editing-lock expiry, hold expiry) produce no database event, so schedule a re-check.
 useEffect(()=>{if(!lv.current)return;const nc=cfg?[cfg.lock_from,cfg.lock_until,cfg.edit_lock_until].filter(t=>t&&new Date(t)>new Date()).sort()[0]:null
  lv.current.nudge(nextCheckMs({slots:slots.map(x=>({state:x.held?'held':''})),nextChange:nc}))},[cfg,slots])
 const fk=formKey(cfg);useEffect(()=>{if(cfg){setLm(cfg.lock_message);setPol(cfg.policy);setAuto(cfg.auto_lock_on_edit);setTzv(cfg.tz)}},[fk])
 /** Runs one teacher action, shows what happened, and ALWAYS refetches afterwards. opts.confirm = {title, body, ...} asks first; opts.ok = success message. Resolves true when the server accepted it. */
 const run = async (fn, args, opts = {}) => {
  if (opts.confirm && !(await confirm(opts.confirm))) return false
  try {const r = await call(fn, args); toast(opts.okFn ? opts.okFn(r) : opts.ok || (typeof r === 'number' ? `Done (${r} changed).` : 'Done.'), 'ok'); sound.play('success'); return true}
  catch (e) {toast(friendly(e), 'bad'); sound.play('error'); return false}
  finally {await refresh()}
 }
 const login = async e => {
  e.preventDefault()
  if(signingIn)return
  setSigningIn(true);setLoginErr('')
  try {
   const {error} = await sb.auth.signInWithPassword({email:em.trim(),password:pw})
   if(error){setLoginErr('Sign-in failed. Check your email and password.');return}
   setPw('')
   // A valid student account is NOT sufficient for teacher access.
   // Check the same server authorization used for protected teacher data.
   const authorized = await call('admin_check')
   if(!authorized){
    await sb.auth.signOut()
    setLoginErr('This account does not have teacher access.')
    return
   }
   await refresh()
  } catch(e) {
   if(isAuthError(e)){
    await sb.auth.signOut().catch(()=>{})
    setLoginErr('This account does not have teacher access.')
   } else setLoginErr('Could not sign in. Check your connection and try again.')
  } finally {setSigningIn(false)}
 }
 const signOut = async () => {
  try {
   const {error} = await sb.auth.signOut()
   if(error)throw error
   location.hash = ''
  } catch {toast('Could not sign out. Check your connection and try again.','bad')}
 }
 if (ok === null) return <TeacherLoading theme={publicTheme} message={stale || 'Preparing your teacher workspace…'} onRetry={stale ? refresh : null} />
 if (!ok) return <SignIn theme={publicTheme} em={em} setEm={setEm} pw={pw} setPw={setPw} onSubmit={login} busy={signingIn} error={loginErr} />
 const nowD = new Date(now), locked = Boolean(cfg && (cfg.locked || (cfg.lock_from && new Date(cfg.lock_from) <= nowD && (!cfg.lock_until || new Date(cfg.lock_until) > nowD))))
 const title = TABS.find(t => t[0] === tab)[1]
 const chooseTab = v => {if(v!==tab)sound.play('navigate');setTab(v)}
 const editLock = cfg && cfg.edit_lock_until && new Date(cfg.edit_lock_until) > nowD
 const view = tab === 'dash' ? <Overview stats={stats} events={ev} cfg={cfg} tz={tz} nowMs={now} setTab={chooseTab} />
  : tab === 'sched' ? <Schedule slots={slots} tz={tz} nowMs={now} run={run} rpc={call} range={range} setRange={setRange} />
  : tab === 'book' ? <Bookings books={books} slots={slots} tz={tz} nowMs={now} run={run} rosterOn={Boolean(cfg?.public_roster)} />
  : tab === 'set' ? (cfg && <SettingsView pol={pol} setPol={setPol} auto={auto} setAuto={setAuto} tzv={tzv} setTzv={setTzv} run={run} rosterOn={Boolean(cfg.public_roster)} theme={safeTheme(cfg.theme)} onWhatsNew={() => setWn(true)} />)
  : (cfg && <LockdownView cfg={cfg} lm={lm} setLm={setLm} lf={lf} setLf={setLf} lu={lu} setLu={setLu} run={run} toast={toast} />)
 return <div className={'tapp' + (wide ? ' wide' : '')} data-theme={safeTheme(cfg?.theme)}><ThemeScene theme={safeTheme(cfg?.theme)} />
  {wide ? <TeacherRail tab={tab} setTab={chooseTab} locked={locked} onSignOut={signOut} onWhatsNew={() => setWn(true)} /> : <TeacherTop title={title} onSignOut={signOut} />}
  <main className="tmain">
   <header className="thead"><div><h1>{title}</h1>
     <p className="small live"><LiveBadge status={live} />{!stale && updated ? <span className="upd"> Updated {updated.toLocaleTimeString()}</span> : null}</p></div>
    <Button size="sm" icon="refresh" aria-label="Refresh now" onClick={refresh}><span className="hide-sm">Refresh now</span></Button></header>
   {stale && <div className="banner bad" role="alert"><Icon name="alert" /><span>{stale}</span></div>}
   {cfg && cfg.public_roster === undefined && <div className="banner bad" role="alert"><Icon name="alert" /><span>Database update 003 has not been applied yet, so live updates, bulk open/close and the roster are unavailable. See SETUP.md.</span></div>}
   {editLock && <div className="banner" role="alert"><Icon name="lock" /><span>Students are locked out until {new Date(cfg.edit_lock_until).toLocaleTimeString()} because you changed the schedule.</span><Button size="sm" onClick={() => run('admin_end_edit', undefined, {ok: 'Editing lock ended.'})}>Finish editing now</Button></div>}
   <div className="tview" key={tab}>{view}</div>
  </main>
  {!wide && <TeacherBottom tab={tab} setTab={chooseTab} locked={locked} />}
  {wn && <WhatsNew onClose={() => setWn(false)} />}
 </div>
}
