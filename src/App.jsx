import {useEffect, useState, useCallback, useRef, lazy, Suspense} from 'react'
import {call, configured, ensureSession, sb} from './sb'
import {STUDENT_POLL_MS} from './poll.js'
import {startRealtime, nextCheckMs, TOPIC_PUBLIC} from './realtime.js'
import {sound} from './sound.js'
import {friendly, ymd, groupSlots, secondsLeft, hm12, dateLabel} from './lib.js'
import {schoolToday} from './slotInfo.js'
import {Sheet, Button, Empty, Skeleton, useToast, useConfirm, useMedia} from './components/ui.jsx'
import Icon from './components/Icon.jsx'
import ThemeScene from './components/ThemeScene.jsx'
import StatusScreen from './components/StatusScreen.jsx'
import LiveBadge from './components/Live.jsx'
import {VersionTag, WhatsNew} from './components/About.jsx'
import Roster from './student/Roster.jsx'
import MonthCalendar from './student/MonthCalendar.jsx'
import DayPanel from './student/DayPanel.jsx'
import ListView from './student/ListView.jsx'
import BookingFlow from './student/BookingFlow.jsx'
import Success from './student/Success.jsx'
import MyBooking from './student/MyBooking.jsx'
import PeriodFilter from './student/PeriodFilter.jsx'
import LockScreen from './student/LockScreen.jsx'
import {Rail, TopBar, BottomNav} from './student/Shell.jsx'
import './styles/ui.css'
import './styles/student.css'
import './styles/liquid-glass.css'
import './styles/themes.css'
import './styles/seasonal-components.css'
import './styles/calendar-layout.css'
import './styles/app-completion.css'
import {safeTheme, applySiteTheme, rememberedTheme} from './themes.js'
// Staff-only code should not be part of every student's initial download.
const Admin = lazy(() => import('./Admin.jsx'))
const ls = {get: k => {try {return localStorage.getItem(k)} catch {return null}}, set: (k, v) => {try {localStorage.setItem(k, v)} catch {}}}
const ss = {get: k => {try {return sessionStorage.getItem(k)} catch {return null}}, set: (k, v) => {try {sessionStorage.setItem(k, v)} catch {}}, del: k => {try {sessionStorage.removeItem(k)} catch {}}}
const TITLES = {cal: 'Reserve a conference', list: 'All times'}

export default function App() {
 const [admin, setAdmin] = useState(location.hash === '#admin'), [st, setSt] = useState(null), [slots, setSlots] = useState(null), [mine, setMine] = useState(null)
 const [view, setView] = useState(ls.get('view') === 'list' ? 'list' : 'cal'), [date, setDate] = useState(null), [month, setMonth] = useState(() => {const n = new Date(); return [n.getFullYear(), n.getMonth()]}), [dir, setDir] = useState(1), [periodFilter, setPeriodFilter] = useState(() => ss.get('student_period') || 'all')
 const [sel, setSel] = useState(null), [end, setEnd] = useState(0), [left, setLeft] = useState(0), [name, setName] = useState(() => ss.get('student_name') || ''), [asg, setAsg] = useState(''), [busy, setBusy] = useState(false), [bad, setBad] = useState(''), [raceLost, setRaceLost] = useState(null)
 const [done, setDone] = useState(null), [expired, setExpired] = useState(null), [roster, setRoster] = useState(null), [consent, setConsent] = useState(false), [live, setLive] = useState('connecting'), [showWhatsNew, setShowWhatsNew] = useState(false), lv = useRef(null)
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
 useEffect(() => { if (!admin && st?.theme) applySiteTheme(st.theme) }, [st?.theme])
 useEffect(() => {ss.set('student_name', name)}, [name])
 useEffect(() => {ss.set('student_period', periodFilter)}, [periodFilter])
 useEffect(() => {ss.del('student_assignment')}, []) // privacy: assignment titles are never retained; clear any legacy v3 prerelease value
 useEffect(() => {
  if (slots === null || periodFilter === 'all') return
  const stillExists = slots.some(s => String(s.period) === periodFilter)
  if (stillExists) return
  const oldPeriod = periodFilter
  setPeriodFilter('all'); setDate(null); setExpired(null); setRaceLost(null)
  toast(`No appointments are available for Period ${oldPeriod} anymore. Showing all periods.`, 'info')
 }, [slots, periodFilter, toast])
 useEffect(() => {
  if (!sel) return
  const i = setInterval(() => {const l = secondsLeft(end, Date.now()); setLeft(l); if (!l) {setExpired(sel); setSel(null); toast('Your hold ended. Pick the time again if you still want it.', 'info'); load()}}, 500)
  return () => clearInterval(i)
 }, [sel, end, load, toast])
 if (!configured) return <StatusScreen theme={rememberedTheme()} title="Conference setup needed" description="The website is missing its server settings. See SETUP.md to connect the conference database."/>
 if (admin) return <Suspense fallback={<StatusScreen theme={rememberedTheme()} loading title="Opening teacher workspace" description="Preparing your teacher dashboard…" />}><Admin /></Suspense>
 const tz = st?.tz || 'America/New_York'
 const periods = [...new Set((slots || []).map(s => s.period))].sort((a,b) => Number(a) - Number(b))
 const openCounts = periods.reduce((m,p) => (m[p] = (slots || []).filter(s => String(s.period) === String(p) && s.state === 'open').length, m), {})
 const periodSlots = periodFilter === 'all' ? (slots || []) : (slots || []).filter(s => String(s.period) === periodFilter)
 const groups = groupSlots(periodSlots, tz), dates = Object.keys(groups), today = schoolToday(tz)
 const pick = async s => {
  if (busy) return; setBusy(true); setExpired(null); setRaceLost(null)
  try {const e = await call('hold_slot', {p_slot: s.id}); setSel(s); sound.play('open'); setEnd(new Date(e).getTime()); setLeft(secondsLeft(new Date(e).getTime(), Date.now()))}
  catch (e) {
   const code = String((e && e.message) || e || '').trim()
   sound.play('warning')
   if (code === 'taken' || code === 'unavailable') {
    try {
     const fresh = await call('list_slots'); setSlots(fresh)
     const alts = fresh.filter(x => x.state === 'open' && x.id !== s.id && (periodFilter === 'all' || String(x.period) === periodFilter)).sort((a,b) => new Date(a.start_at) - new Date(b.start_at)).slice(0,3)
     setRaceLost({slot:s, alts})
     toast('Someone grabbed that time first — pick another opening below.', 'bad')
    } catch {toast(friendly(e), 'bad'); load()}
   } else {toast(friendly(e), 'bad'); load()}
  }
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
 const drop = async () => {sound.play('close');setSel(null); setExpired(null); try {await call('release_my_hold')} catch {} load()}
 const cancel = async () => {
  const ok = await confirm({title: 'Cancel your conference?', body: `${dateLabel(ymd(mine.start_at, tz))} at ${hm12(mine.start_at, tz)} will be released for other students.`, confirm: 'Cancel conference', cancel: 'Keep it', danger: true})
  if (!ok) return
  try {await call('cancel_my_booking'); setDone(null); sound.play('cancel'); toast('Your conference was cancelled.', 'ok')} catch (e) {toast(friendly(e), 'bad'); sound.play('error')}
  load()
 }
 const changeConsent = async v => {try {await call('set_my_roster_consent', {p_show: v}); toast(v ? 'Your name may appear on the roster when your teacher turns it on.' : 'Your name will not appear on the roster.', 'ok')} catch (e) {toast(friendly(e), 'bad')} load()}
 const setV = v => {sound.play('navigate');setView(v);ls.set('view', v)}
 const onDay = d => {if (sel) drop(); sound.play('day'); setExpired(null); setDate(d)}
 const openSlots = periodSlots.filter(s => s.state === 'open').sort((a,b) => new Date(a.start_at) - new Date(b.start_at))
 const nextSlot = openSlots[0] || null
 const nextOpen = nextSlot ? ymd(nextSlot.start_at, tz) : dates.find(d => Object.values(groups[d]).flat().some(s => s.state === 'open'))
 const reserveNext = () => {
  if (!nextSlot || mine || busy) return
  const d = ymd(nextSlot.start_at, tz), [yy, mm] = d.split('-').map(Number)
  setMonth([yy, mm - 1]); setDate(d); pick(nextSlot)
 }
 if (!st) return <StatusScreen theme={rememberedTheme()} loading={!bad} title={bad ? 'Connection interrupted' : 'Getting conferences ready'} description={bad || 'Loading dates, times, and the current conference schedule…'}/>
 if (st.locked) return <LockScreen message={st.message} live={live} theme={safeTheme(st.theme)} />

 const panelOpen = Boolean(done || sel || (view === 'cal' && date))
 const closePanel = () => {if (sel) drop(); setDate(null); setDone(null); setExpired(null)}
 const flowKey = done ? 'done' : sel ? 'sel' : 'day'
 const panelBody = done ? <Success done={done} onDone={() => setDone(null)} />
  : sel ? <BookingFlow sel={sel} tz={tz} left={left} name={name} setName={setName} asg={asg} setAsg={setAsg} consent={consent} setConsent={setConsent} busy={busy} onSubmit={book} onRelease={drop} />
  : date ? <DayPanel date={date} groups={groups} tz={tz} hasBooking={Boolean(mine)} busy={busy} onPick={pick} expired={expired} onRetry={pick} />
  : <div className="panel-home"><Empty title={nextOpen ? 'Choose a day' : 'No open times right now'}>{nextOpen ? 'Pick a highlighted day to see its times, or jump to the next opening.' : 'Everything posted is booked or unavailable. New times appear here by themselves.'}</Empty>
    {nextOpen && !mine && <Button variant="primary" icon="sparkle" onClick={() => {const [y, m] = nextOpen.split('-').map(Number); setMonth([y, m - 1]); onDay(nextOpen)}}>Next open: {dateLabel(nextOpen)}</Button>}</div>
 const notices = <div aria-live="polite">
  {bad && <div className="banner bad" role="alert"><Icon name="alert" /><span>{bad}</span></div>}
  {raceLost && <div className="banner race-recovery" role="alert"><Icon name="clock" /><div><b>That one was just taken.</b><span> Try one of the next open times:</span></div>
   <div className="race-alts">{raceLost.alts.length ? raceLost.alts.map(a => <Button key={a.id} size="sm" variant="primary" disabled={busy || Boolean(mine)} onClick={() => pick(a)}>{hm12(a.start_at, tz)} · {dateLabel(ymd(a.start_at, tz))}</Button>) : <span className="small">No other openings right now.</span>}</div>
   <Button size="sm" variant="ghost" icon="x" aria-label="Dismiss" onClick={() => setRaceLost(null)} />
  </div>}
 </div>
 const changePeriod = p => {
  sound.play('navigate'); setPeriodFilter(p); setDate(null); setExpired(null); setRaceLost(null)
 }
 const main = <>{!wide && mine && <MyBooking mine={mine} tz={tz} onCancel={cancel} onConsent={changeConsent} rosterOn={Boolean(st.roster_on)} />}
    {slots !== null && <PeriodFilter periods={periods} value={periodFilter} onChange={changePeriod} openCounts={openCounts} />}
    {slots === null ? <Skeleton h={320} /> : <div className="viewswap" key={view}>{view === 'cal'
      ? <><MonthCalendar groups={groups} month={month} setMonth={setMonth} date={date} onPick={onDay} today={today} dir={dir} setDir={setDir} policy={st.policy} nextSlot={nextSlot} onNextOpen={reserveNext} hasBooking={Boolean(mine)} busy={busy} />
        {st.roster_on && roster && <Roster rows={roster} tz={tz} />}</>
      : <ListView groups={groups} tz={tz} hasBooking={Boolean(mine)} busy={busy} onPick={pick} />}</div>}
    {slots && !dates.length && <Empty title={periodFilter === 'all' ? 'No conference times are posted yet' : `No Period ${periodFilter} times right now`}>{periodFilter === 'all' ? 'Check back soon.' : 'Try another period or choose All periods.'}</Empty>}</>
 return <div className={'app' + (wide ? ' wide' : '')} data-theme={safeTheme(st.theme)}><ThemeScene theme={safeTheme(st.theme)} />
  {wide ? <Rail view={view} setView={setV} hasBooking={Boolean(mine)} /> : <TopBar title={TITLES[view]} live={live} />}
  <main className="work"><header className="work-head"><div className="work-title"><h1>Reserve your writing conference</h1><LiveBadge status={live} /></div><p className="lede">Pick a day, choose a time, confirm within 15 seconds.</p></header>{notices}{main}<footer className="vfoot"><button type="button" className="student-changelog-link" onClick={() => setShowWhatsNew(true)} aria-label="Open what's new in English Conferences"><VersionTag /></button></footer></main>
  {wide && <aside className="panel" aria-label="Appointment details">{mine && <MyBooking mine={mine} tz={tz} onCancel={cancel} onConsent={changeConsent} rosterOn={Boolean(st.roster_on)} />}<div className="panel-inner" key={flowKey + (date || '')}>{panelBody}</div></aside>}
  {!wide && <BottomNav view={view} setView={setV} hasBooking={Boolean(mine)} />}
  {!wide && panelOpen && <Sheet label={done ? 'Booking confirmed' : sel ? 'Confirm reservation' : dateLabel(date)} onClose={closePanel}><div key={flowKey}>{panelBody}</div></Sheet>}
  {showWhatsNew && <WhatsNew onClose={() => setShowWhatsNew(false)} />}
 </div>
}
