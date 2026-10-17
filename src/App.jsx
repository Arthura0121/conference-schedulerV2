import {useEffect, useState, useCallback, useRef} from 'react'
import {call, configured, ensureSession} from './sb'
import {sb} from './sb'
import Admin from './Admin.jsx'
import {STUDENT_POLL_MS} from './poll.js'
import {startRealtime, nextCheckMs, TOPIC_PUBLIC} from './realtime.js'
import {sound} from './sound.js'
import {friendly, ymd, groupSlots, secondsLeft, validText, hm12, dateLabel} from './lib.js'
import {schoolToday} from './slotInfo.js'
import {Sheet, Button, Empty, Skeleton, useToast, useConfirm, useMedia} from './components/ui.jsx'
import Icon from './components/Icon.jsx'
import Starfield from './components/Starfield.jsx'
import './styles/starfield.css'
import {AuroraArt} from './components/Brand.jsx'
import LiveBadge from './components/Live.jsx'
import {VersionTag} from './components/About.jsx'
import Roster from './student/Roster.jsx'
import MonthCalendar from './student/MonthCalendar.jsx'
import DayPanel from './student/DayPanel.jsx'
import ListView from './student/ListView.jsx'
import BookingFlow from './student/BookingFlow.jsx'
import Success from './student/Success.jsx'
import MyBooking from './student/MyBooking.jsx'
import SoundToggle from './student/SoundToggle.jsx'
import LockScreen from './student/LockScreen.jsx'
import {Rail, TopBar, BottomNav} from './student/Shell.jsx'
import './styles/ui.css'
import './styles/student.css'
const ls = {get: k => {try {return localStorage.getItem(k)} catch {return null}}, set: (k, v) => {try {localStorage.setItem(k, v)} catch {}}}
const TITLES = {cal: 'Reserve a conference', list: 'All times', info: 'Rules'}

export default function App() {
 const [admin, setAdmin] = useState(location.hash === '#admin'), [st, setSt] = useState(null), [slots, setSlots] = useState(null), [mine, setMine] = useState(null)
 const [view, setView] = useState(ls.get('view') === 'list' ? 'list' : 'cal'), [date, setDate] = useState(null), [month, setMonth] = useState(() => {const n = new Date(); return [n.getFullYear(), n.getMonth()]}), [dir, setDir] = useState(1)
 const [sel, setSel] = useState(null), [end, setEnd] = useState(0), [left, setLeft] = useState(0), [name, setName] = useState(''), [asg, setAsg] = useState(''), [busy, setBusy] = useState(false), [bad, setBad] = useState('')
 const [done, setDone] = useState(null), [expired, setExpired] = useState(null), [roster, setRoster] = useState(null), [consent, setConsent] = useState(false), [live, setLive] = useState('connecting'), lv = useRef(null)
 const toast = useToast(), confirm = useConfirm(), wide = useMedia('(min-width: 1000px)')
 const load=useCallback(async()=>{if(!configured)return;try{await ensureSession()
  const[a,b,c]=await Promise.all([call('public_state'),call('list_slots'),call('my_booking')])
  let r=null;if(a&&a.roster_on&&!a.locked){try{r=await call('list_roster')}catch{r=null}}   // names only exist in this response if the DATABASE allowed them
  setSt(a);setSlots(b);setMine(c[0]||null);setRoster(r);setBad('')
  lv.current?.nudge(nextCheckMs({slots:b.map(x=>({state:x.state})),nextChange:a&&a.next_change}))}catch{setBad('Could not reach the server. Check your connection; this page will retry.')}},[])
 useEffect(() => {const h = () => setAdmin(location.hash === '#admin'); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h)}, [])
 // Live updates: the database sends a tiny "something changed" signal and we refetch. Polling is only the fallback (15 s) and a slow safety check (60 s).
 // The teacher page has its own connection; don't run the student one behind it.
 useEffect(()=>{if(admin||!configured)return;const h=startRealtime({client:sb,topic:TOPIC_PUBLIC,refresh:load,prepare:ensureSession,onStatus:setLive,fallbackMs:STUDENT_POLL_MS,reconcileMs:60000});lv.current=h;return()=>{h.stop();lv.current=null}},[load,admin])
 useEffect(() => {document.body.classList.toggle('has-nav', !wide && !admin); return () => document.body.classList.remove('has-nav')}, [wide, admin])
 useEffect(() => {
  if (!sel) return
  const i = setInterval(() => {const l = secondsLeft(end, Date.now()); setLeft(l); if (!l) {setExpired(sel); setSel(null); toast('Your hold ended. Pick the time again if you still want it.', 'info'); load()}}, 500)
  return () => clearInterval(i)
 }, [sel, end, load, toast])
 if (!configured) return <main className="center-screen"><AuroraArt /><h1>Not configured</h1><p className="small">This site is missing its Supabase settings. See SETUP.md, step "Connect the website".</p></main>
 if (admin) return <Admin />
 const tz = st?.tz || 'America/New_York', groups = groupSlots(slots || [], tz), dates = Object.keys(groups), today = schoolToday(tz)
 const pick = async s => {
  if (busy) return; setBusy(true); setExpired(null)
  try {const e = await call('hold_slot', {p_slot: s.id}); setSel(s); sound.play('select'); setEnd(new Date(e).getTime()); setLeft(secondsLeft(new Date(e).getTime(), Date.now()))}
  catch (e) {toast(friendly(e), 'bad'); sound.play('error'); load()}
  setBusy(false)
 }
 const book = async () => {
  if (busy) return; setBusy(true)
  try {
   await call('confirm_booking', {p_slot: sel.id, p_name: name, p_assignment: asg, p_show_name: consent})
   setDone({d: dateLabel(ymd(sel.start_at, tz)), t: hm12(sel.start_at, tz), room: sel.room, p: sel.period, raw: sel}); sound.play('success'); setSel(null); setDate(null); setConsent(false)
  } catch (e) {toast(friendly(e), 'bad'); sound.play('error'); setSel(null)}
  setBusy(false); load()
 }
 const drop = async () => {setSel(null); setExpired(null); try {await call('release_my_hold')} catch {} load()}
 const cancel = async () => {
  const ok = await confirm({title: 'Cancel your conference?', body: `${dateLabel(ymd(mine.start_at, tz))} at ${hm12(mine.start_at, tz)} will be released for other students.`, confirm: 'Cancel conference', cancel: 'Keep it', danger: true})
  if (!ok) return
  try {await call('cancel_my_booking'); setDone(null); sound.play('cancel'); toast('Your conference was cancelled.', 'ok')} catch (e) {toast(friendly(e), 'bad'); sound.play('error')}
  load()
 }
 const changeConsent = async v => {try {await call('set_my_roster_consent', {p_show: v}); toast(v ? 'Your name may appear on the roster when your teacher turns it on.' : 'Your name will not appear on the roster.', 'ok')} catch (e) {toast(friendly(e), 'bad')} load()}
 const setV = v => {setView(v); if (v !== 'info') ls.set('view', v)}
 const onDay = d => {if (sel) drop(); sound.play('tick'); setExpired(null); setDate(d)}
 const nextOpen = dates.find(d => Object.values(groups[d]).flat().some(s => s.state === 'open'))
 if (!st) return <main className="center-screen" role="status" aria-live="polite">{bad ? <><AuroraArt /><p>{bad}</p></> : <div style={{width: 'min(420px,90vw)'}}><Skeleton h={28} /><div style={{height: 14}} /><Skeleton h={220} /></div>}</main>
 if (st.locked) return <LockScreen message={st.message} live={live} />

 const panelOpen = Boolean(done || sel || (view === 'cal' && date))
 const closePanel = () => {if (sel) drop(); setDate(null); setDone(null); setExpired(null)}
 const flowKey = done ? 'done' : sel ? 'sel' : 'day'
 const panelBody = done ? <Success done={done} onDone={() => setDone(null)} />
  : sel ? <BookingFlow sel={sel} tz={tz} left={left} name={name} setName={setName} asg={asg} setAsg={setAsg} consent={consent} setConsent={setConsent} busy={busy} onSubmit={book} onRelease={drop} />
  : date ? <DayPanel date={date} groups={groups} tz={tz} hasBooking={Boolean(mine)} busy={busy} onPick={pick} expired={expired} onRetry={pick} />
  : <div className="panel-home"><Empty title={nextOpen ? 'Choose a day' : 'No open times right now'}>{nextOpen ? 'Pick a highlighted day to see its times, or jump to the next opening.' : 'Everything posted is booked or unavailable. New times appear here by themselves.'}</Empty>
    {nextOpen && !mine && <Button variant="primary" icon="sparkle" onClick={() => {const [y, m] = nextOpen.split('-').map(Number); setMonth([y, m - 1]); onDay(nextOpen)}}>Next open: {dateLabel(nextOpen)}</Button>}</div>
 const notices = <div aria-live="polite">{bad && <div className="banner bad" role="alert"><Icon name="alert" /><span>{bad}</span></div>}</div>
 const main = view === 'info'
  ? <section className="infov"><h2>Rules</h2><div className="card"><p className="pre">{st.policy}</p></div>{mine && <MyBooking mine={mine} tz={tz} onCancel={cancel} onConsent={changeConsent} rosterOn={Boolean(st.roster_on)} />}<div className="card row"><span>Sounds</span><span className="spacer" /><SoundToggle /></div>{st.roster_on && roster && <Roster rows={roster} tz={tz} />}<p className="small"><a href="#admin">Teacher login</a></p></section>
  : <>{!wide && mine && <MyBooking mine={mine} tz={tz} onCancel={cancel} onConsent={changeConsent} rosterOn={Boolean(st.roster_on)} />}
    {slots === null ? <Skeleton h={320} /> : <div className="viewswap" key={view}>{view === 'cal'
      ? <MonthCalendar groups={groups} month={month} setMonth={setMonth} date={date} onPick={onDay} today={today} dir={dir} setDir={setDir} />
      : <ListView groups={groups} tz={tz} hasBooking={Boolean(mine)} busy={busy} onPick={pick} />}</div>}
    {slots && !dates.length && <Empty title="No conference times are posted yet">Check back soon.</Empty>}</>
 return <div className={'app' + (wide ? ' wide' : '')}><Starfield />
  {wide ? <Rail view={view} setView={setV} hasBooking={Boolean(mine)} /> : <TopBar title={TITLES[view]} />}
  <main className="work"><header className="work-head"><div className="work-title"><h1>Reserve your writing conference</h1><LiveBadge status={live} /></div><p className="lede">Pick a day, choose a time, confirm within 15 seconds.</p></header>{notices}{main}<footer className="vfoot"><VersionTag /></footer></main>
  {wide && <aside className="panel" aria-label="Appointment details">{mine && <MyBooking mine={mine} tz={tz} onCancel={cancel} onConsent={changeConsent} rosterOn={Boolean(st.roster_on)} />}<div className="panel-inner" key={flowKey + (date || '')}>{panelBody}</div><details className="rules card" open><summary>Rules</summary><p className="pre">{st.policy}</p></details></aside>}
  {!wide && <BottomNav view={view} setView={setV} hasBooking={Boolean(mine)} />}
  {!wide && panelOpen && <Sheet label={done ? 'Booking confirmed' : sel ? 'Confirm reservation' : dateLabel(date)} onClose={closePanel}><div key={flowKey}>{panelBody}</div></Sheet>}
 </div>
}
