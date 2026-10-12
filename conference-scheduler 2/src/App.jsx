import {useEffect,useRef,useState,useCallback} from 'react'
import {sb,call,configured} from './sb'
import Admin from './Admin.jsx'
import {friendly,ymd,groupSlots,dayState,monthGrid,secondsLeft,validText,hm12,dateLabel,STATE_LABEL} from './lib.js'
const ls={get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}}
function Dlg({label,onClose,children}){const r=useRef();useEffect(()=>{if(r.current&&!r.current.open)r.current.showModal()},[])
 return<dialog ref={r} className="dlg" aria-label={label} onClose={onClose} onClick={e=>e.target===r.current&&r.current.close()}><div className="dlgbody">{children}</div></dialog>}
function Slots({groups,tz,mine,busy,pick}){return Object.entries(groups).map(([p,ss])=><div key={p}><h3>Period {p}</h3><ul className="slots">{ss.map(s=><li key={s.id} className={'slot '+s.state}>
 <span>{hm12(s.start_at,tz)}–{hm12(s.end_at,tz)} · Room {s.room}</span><b>{s.mine&&s.state==='booked'?'Your booking':STATE_LABEL[s.state]}</b>
 {s.state==='open'&&!mine&&<button disabled={busy} onClick={()=>pick(s)}>Reserve</button>}</li>)}</ul></div>)}
function Calendar({groups,month,setMonth,onPick,date}){const[y,m]=month,label=new Date(Date.UTC(y,m,1)).toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})
 const go=d=>{const x=new Date(Date.UTC(y,m+d,1));setMonth([x.getUTCFullYear(),x.getUTCMonth()])}
 const CAP={none:'',available:'open',partial:'some open',full:'full',unavailable:'closed'}
 return<section aria-label="Calendar"><div className="calhead"><button onClick={()=>go(-1)} aria-label="Previous month">‹</button><h2>{label}</h2><button onClick={()=>go(1)} aria-label="Next month">›</button></div>
 <div className="cal" role="grid"><div className="dow" role="row">{'SMTWTFS'.split('').map((d,i)=><span key={i} role="columnheader">{d}</span>)}</div>
 {monthGrid(y,m).flat().map((d,i)=>{if(!d)return<span key={i} className="cell empty"/>;const g=groups[d],list=g?Object.values(g).flat():[],st=dayState(list),n=list.filter(s=>s.state==='open').length
  return<button key={i} className={'cell '+st+(d===date?' sel':'')} disabled={st==='none'} onClick={()=>onPick(d)} aria-label={`${dateLabel(d)}: ${st==='none'?'no conferences':n+' open'}`}><b>{+d.slice(8)}</b>{st!=='none'&&<small>{st==='available'||st==='partial'?n+' '+CAP[st]:CAP[st]}</small>}</button>})}</div></section>}
export default function App(){
 const[admin,setAdmin]=useState(location.hash==='#admin'),[st,setSt]=useState(null),[slots,setSlots]=useState(null),[mine,setMine]=useState(null)
 const[view,setView]=useState(ls.get('view')||'cal'),[date,setDate]=useState(null),[month,setMonth]=useState(()=>{const n=new Date();return[n.getFullYear(),n.getMonth()]})
 const[sel,setSel]=useState(null),[end,setEnd]=useState(0),[left,setLeft]=useState(0),[name,setName]=useState(''),[asg,setAsg]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[bad,setBad]=useState('')
 const load=useCallback(async()=>{if(!configured)return;try{const{data}=await sb.auth.getSession();if(!data.session){const{error}=await sb.auth.signInAnonymously();if(error)throw error}
  const[a,b,c]=await Promise.all([call('public_state'),call('list_slots'),call('my_booking')]);setSt(a);setSlots(b);setMine(c[0]||null);setBad('')}catch{setBad('Could not reach the server. Check your connection; this page will retry.')}},[])
 useEffect(()=>{const h=()=>setAdmin(location.hash==='#admin');addEventListener('hashchange',h);return()=>removeEventListener('hashchange',h)},[])
 useEffect(()=>{load();const i=setInterval(load,15000);return()=>clearInterval(i)},[load])
 useEffect(()=>{if(!sel)return;const i=setInterval(()=>{const l=secondsLeft(end,Date.now());setLeft(l);if(!l){setSel(null);setNote('Your hold expired. Pick the time again if you still want it.');load()}},500);return()=>clearInterval(i)},[sel,end,load])
 if(!configured)return<main><h1>Not configured</h1><p>This site is missing its Supabase settings. See SETUP.md, step "Connect the website".</p></main>
 if(admin)return<Admin/>
 const tz=st?.tz||'America/New_York',groups=groupSlots(slots||[],tz),dates=Object.keys(groups)
 const pick=async s=>{if(busy)return;setNote('');setBusy(true);try{const e=await call('hold_slot',{p_slot:s.id});setSel(s);setEnd(new Date(e).getTime());setLeft(secondsLeft(new Date(e).getTime(),Date.now()))}catch(e){setNote(friendly(e));load()}setBusy(false)}
 const book=async ev=>{ev.preventDefault();if(busy)return;if(!validText(name,80)||!validText(asg,200)){setNote('Please enter your name and the writing piece.');return}setBusy(true)
  try{await call('confirm_booking',{p_slot:sel.id,p_name:name,p_assignment:asg});setSel(null);setDate(null);setNote('Booked! Your conference is confirmed.')}catch(e){setNote(friendly(e));setSel(null)}setBusy(false);load()}
 const drop=async()=>{setSel(null);try{await call('release_my_hold')}catch{}load()}
 const cancel=async()=>{if(!window.confirm('Cancel your conference?'))return;try{await call('cancel_my_booking');setNote('Your conference was cancelled.')}catch(e){setNote(friendly(e))}load()}
 const setV=v=>{setView(v);ls.set('view',v)}
 if(!st)return<main><p role="status">{bad||'Loading…'}</p></main>
 if(st.locked)return<main className="lock"><h1>{st.message}</h1><p>Booking is temporarily unavailable. Your existing bookings are safe.</p><footer><a href="#admin">Teacher login</a></footer></main>
 return<main><h1>English Writing Conferences</h1><section className="card"><h2>Rules</h2><p className="pre">{st.policy}</p></section>
 <div aria-live="polite">{bad&&<p className="note warn">{bad}</p>}{note&&<p role="status" className="note">{note}</p>}</div>
 {mine&&<section className="card"><b>Your conference:</b> {dateLabel(ymd(mine.start_at,tz))}, period {mine.period}, {hm12(mine.start_at,tz)}, room {mine.room}. <button onClick={cancel}>Cancel</button></section>}
 <div role="group" aria-label="View" className="tabs"><button aria-pressed={view==='cal'} onClick={()=>setV('cal')}>Calendar</button><button aria-pressed={view==='list'} onClick={()=>setV('list')}>List</button></div>
 {slots===null&&<div className="skel" aria-hidden="true"/>}{slots&&!dates.length&&<p className="empty-msg">No conference times are posted yet. Check back soon.</p>}
 {view==='cal'?<Calendar groups={groups} month={month} setMonth={setMonth} date={date} onPick={setDate}/>:dates.map(d=><section key={d} className="card"><h2>{dateLabel(d)}</h2><Slots groups={groups[d]} tz={tz} mine={mine} busy={busy} pick={pick}/></section>)}
 {view==='cal'&&date&&groups[date]&&!sel&&<Dlg label={dateLabel(date)} onClose={()=>setDate(null)}><h2>{dateLabel(date)}</h2><Slots groups={groups[date]} tz={tz} mine={mine} busy={busy} pick={pick}/><button onClick={()=>setDate(null)}>Close</button></Dlg>}
 {sel&&<Dlg label="Confirm reservation" onClose={drop}><form onSubmit={book}><h2>{hm12(sel.start_at,tz)} · Period {sel.period} · Room {sel.room}</h2><p role="timer" className="timer">Held for you: {left}s</p>
  <label>Your full name<input required maxLength={80} autoComplete="name" autoFocus value={name} onChange={e=>setName(e.target.value)}/></label>
  <label>Writing piece you will revise<input required maxLength={200} value={asg} onChange={e=>setAsg(e.target.value)}/></label>
  <button disabled={busy}>{busy?'Saving…':'Confirm reservation'}</button> <button type="button" onClick={drop}>Release</button></form></Dlg>}
<footer><a href="#admin">Teacher login</a></footer></main>}
