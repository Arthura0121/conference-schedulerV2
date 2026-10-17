import {useRef} from 'react'
import Icon from '../components/Icon.jsx'
import {monthGrid, dayState, dateLabel} from '../lib.js'

const WEEK=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const FULL=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const DOT={open:'o',held:'h',booked:'b',unavailable:'u'}
export const monthLabel=(y,m)=>new Date(Date.UTC(y,m,1)).toLocaleString('en-US',{month:'long',year:'numeric',timeZone:'UTC'})
const stats=list=>({open:list.filter(s=>s.state==='open').length,total:list.length})
const flat=(groups,d)=>groups[d]?Object.values(groups[d]).flat():[]
const weekday=d=>new Date(d+'T12:00:00Z').getUTCDay()

/** After Dark: cinematic month overview + week navigator; no changes to booking or availability rules. */
export default function MonthCalendar({groups,month,setMonth,date,onPick,today,dir,setDir}){
 const [y,m]=month,grid=useRef()
 const go=d=>{const x=new Date(Date.UTC(y,m+d,1));setDir(d);setMonth([x.getUTCFullYear(),x.getUTCMonth()])}
 const jumpToday=()=>{const [ty,tm]=today.split('-').map(Number);setDir(ty*12+tm-1>y*12+m?1:-1);setMonth([ty,tm-1])}
 const cells=monthGrid(y,m).flat()
 const inMonth=cells.filter(Boolean),all=inMonth.flatMap(d=>flat(groups,d))
 const {open:openThisMonth,total:totalThisMonth}=stats(all)
 const daysWithOpen=inMonth.filter(d=>stats(flat(groups,d)).open>0).length
 const selectedIndex=cells.indexOf(date)
 const todayIndex=cells.indexOf(today)
 const start=selectedIndex>=0?Math.floor(selectedIndex/7)*7:todayIndex>=0?Math.floor(todayIndex/7)*7:Math.max(0,Math.floor((cells.findIndex(d=>d&&stats(flat(groups,d)).open>0)||0)/7)*7)
 const week=cells.slice(start,start+7)
 const onKey=e=>{
  const k={ArrowRight:1,ArrowLeft:-1,ArrowDown:7,ArrowUp:-7}[e.key];if(!k)return
  const btns=[...grid.current.querySelectorAll('button.day:not(:disabled)')],i=btns.indexOf(document.activeElement);if(i<0)return
  const pos=cells.indexOf(document.activeElement.dataset.date),next=cells[pos+k]
  const n=next&&grid.current.querySelector('button.day[data-date="'+next+'"]:not(:disabled)')
  if(n){e.preventDefault();n.focus()}
 }
 return <section className="cal afterdark-cal" aria-label="Conference calendar">
  <header className="ad-hero">
   <div className="ad-orbit" aria-hidden="true"><span/><span/><span/></div>
   <div className="ad-hero-main">
    <p className="ad-eyebrow"><span className="ad-spark" aria-hidden="true"/> THE CONFERENCE CALENDAR</p>
    <h2 className="cal-title" key={y+'-'+m}>{monthLabel(y,m)}</h2>
    <p className="ad-hero-copy">Find your moment. Choose an open time and make it yours.</p>
    <div className="ad-stat-row" aria-live="polite">
     <span className="ad-stat"><b className="num">{openThisMonth}</b> open times</span>
     <span className="ad-stat"><b className="num">{daysWithOpen}</b> days with openings</span>
     <span className="ad-stat muted"><b className="num">{totalThisMonth}</b> posted slots</span>
    </div>
   </div>
   <div className="ad-nav">
    <button className="ad-today" onClick={jumpToday}>Jump to today</button>
    <div className="ad-nav-arrows">
     <button onClick={()=>go(-1)} aria-label="Previous month"><Icon name="left"/></button>
     <button onClick={()=>go(1)} aria-label="Next month"><Icon name="right"/></button>
    </div>
   </div>
  </header>
  <div className="ad-week">
   <div className="ad-sectionline"><span>FOCUS WEEK</span><small>Select a day to explore its times</small></div>
   <div className="ad-week-grid" aria-label="Quick-select days of the focused week">
    {week.map((d,i)=>{
     const st=d?stats(flat(groups,d)):{open:0,total:0}
     return d?<button key={d} className={'ad-week-day'+(d===date?' active':'')+(st.open?' has-open':'')} disabled={!st.total} onClick={()=>onPick(d)} aria-pressed={d===date} aria-label={dateLabel(d)+': '+st.open+' open'}>
      <span>{WEEK[weekday(d)]}</span><b>{+d.slice(8)}</b><small>{st.open?st.open+' open':st.total?'Full':'—'}</small>
     </button>:<span key={i} className="ad-week-blank"/>
    })}
   </div>
  </div>
  <div className="ad-month-title"><div><span className="ad-eyebrow">MONTH OVERVIEW</span><h3>Choose your date</h3></div><span className="ad-month-note">Live availability</span></div>
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
 </section>
}
