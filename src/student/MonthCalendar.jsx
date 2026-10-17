import {useRef} from 'react'
import Icon from '../components/Icon.jsx'
import {sound} from '../sound.js'
import {monthGrid, dayState, dateLabel} from '../lib.js'

const WEEK=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const FULL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DOT={open:'o',held:'h',booked:'b',unavailable:'u'}
export const monthLabel=(y,m)=>new Date(Date.UTC(y,m,1)).toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})
const stats=list=>({open:list.filter(s=>s.state==='open').length,total:list.length})
const flat=(groups,d)=>groups[d]?Object.values(groups[d]).flat():[]
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay()

/** After Dark: cinematic month overview + week navigator; no changes to booking or availability rules. */
export default function MonthCalendar({groups,month,setMonth,date,onPick,today,dir,setDir,policy}){
 const [y,m]=month,grid=useRef()
 const go=d=>{sound.play('navigate');const x=new Date(Date.UTC(y,m+d,1));setDir(d);setMonth([x.getUTCFullYear(),x.getUTCMonth()])}
 const jumpToday=()=>{sound.play('day');const [ty,tm]=today.split('-').map(Number);setDir(ty*12+tm-1>y*12+m?1:-1);setMonth([ty,tm-1])}
 const cells=monthGrid(y,m).flat()
 const inMonth=cells.filter(Boolean),all=inMonth.flatMap(d=>flat(groups,d))
 const {open:openThisMonth,total:totalThisMonth}=stats(all)
 const daysWithOpen=inMonth.filter(d=>stats(flat(groups,d)).open>0).length
 const onKey=e=>{
  const k={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7}[e.key];if(!k||!grid.current)return
  const active=document.activeElement
  if(!active?.matches?.('button.day:not(:disabled)'))return
  let pos=cells.indexOf(active.dataset.date)
  if(pos<0)return
  // Keep moving in the requested direction until a usable day is found.
  // This prevents keyboard focus from getting trapped by empty/disabled dates.
  while(true){
   pos+=k
   if(pos<0||pos>=cells.length)return
   const next=cells[pos]
   if(!next)continue
   const n=grid.current.querySelector('button.day[data-date="'+next+'"]:not(:disabled)')
   if(n){e.preventDefault();n.focus();return}
  }
 }
 return <section className="cal afterdark-cal ad-fast-calendar" aria-label="Conference calendar">
  <div className="ad-fast-shell">
   <header className="ad-fast-head">
    <div className="ad-fast-title">
     <h2 className="cal-title" key={y+'-'+m}>{monthLabel(y,m)}</h2>
     <div className="ad-fast-stats" aria-live="polite">
      <span><b className="num">{openThisMonth}</b> open</span>
      <span><b className="num">{daysWithOpen}</b> days</span>
     </div>
    </div>
    <div className="ad-fast-actions">
     {policy && <details className="ad-fast-rules">
      <summary><Icon name="info" size={15}/>Rules</summary>
      <div className="ad-fast-rules-pop"><p className="pre">{policy}</p></div>
     </details>}
     <button className="ad-today" onClick={jumpToday}>Today</button>
     <div className="ad-nav-arrows">
      <button onClick={()=>go(-1)} aria-label="Previous month"><Icon name="left"/></button>
      <button onClick={()=>go(1)} aria-label="Next month"><Icon name="right"/></button>
     </div>
    </div>
   </header>
   <div className="ad-calendar-frame" aria-label="Month calendar and availability">
  <div className="dow" aria-hidden="true">{WEEK.map((d,i)=><span key={i}>{d}</span>)}</div>
  <div className="days" ref={grid} key={y+'-'+m} data-dir={dir} role="group" aria-label={'Days of '+monthLabel(y,m)} onKeyDown={onKey}>
   {cells.map((d,i)=>{
    if(!d)return <span key={i} className="day empty"/>
    const list=flat(groups,d),st=dayState(list),{open:n,total}=stats(list)
    const ratio=total?Math.round(100*n/total):0
    return <button key={d} data-date={d} className={'day '+st+(d===date?' sel':'')+(d===today?' today':'')} disabled={st==='none'} aria-pressed={d===date} aria-current={d===today?'date':undefined}
     onClick={()=>onPick(d)} aria-label={dateLabel(d)+': '+(total?n+' of '+total+' times open':'no conferences')} title={FULL[weekday(d)]}>
     <span className="ad-day-top"><b>{+d.slice(8)}</b>{d===today&&<span className="ad-today-dot" aria-hidden="true"/>}</span>
     {st!=='none'&&<><span className="ad-availability"><strong>{n}</strong><span> / {total}<small>open</small></span></span>
      <span className="ad-meter" aria-hidden="true"><i style={{width:ratio+'%'}}/></span>
      <span className="ribbons" aria-hidden="true">{list.slice(0,12).map(s=><i key={s.id} className={DOT[s.state]}/>)}</span>
     </>}
     {st==='none'&&<span className="ad-no-slots" aria-hidden="true">—</span>}
    </button>
   })}
  </div>
  <ul className="legend" aria-label="Legend"><li><i className="o" aria-hidden="true"/>Open</li><li><i className="h" aria-hidden="true"/>Held</li><li><i className="b" aria-hidden="true"/>Booked</li><li><i className="u" aria-hidden="true"/>Unavailable</li></ul>
  </div>
  </div>
 </section>
}
