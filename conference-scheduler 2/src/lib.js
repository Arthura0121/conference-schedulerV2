// Pure helpers (no React, no network): unit-tested in tests/unit.
export const MESSAGES={locked:'Booking is temporarily closed.',taken:'Someone just took that time. Please pick another.',already_booked:'You already have a conference booked.',hold_expired:'Your 60-second hold expired. Please pick the time again.',unavailable:'That time is not available.',past:'That time has already passed.',too_late:'Cancellations need 24 hours notice. Please ask your teacher.',invalid_input:'Please check what you typed.',invalid_time:'End time must be after start time.',conflict:'That overlaps another appointment in the same room.',has_booking:'That slot has a booking. Cancel or move it first.',forbidden:'You do not have permission to do that.',not_signed_in:'Please refresh the page and try again.'}
export const friendly=e=>MESSAGES[String((e&&e.message)||e||'').trim()]||'Something went wrong. Please try again.'
const fmt=(tz,o,loc='en-US')=>new Intl.DateTimeFormat(loc,{timeZone:tz,...o})
export const ymd=(iso,tz)=>fmt(tz,{year:'numeric',month:'2-digit',day:'2-digit'},'en-CA').format(new Date(iso))
export const hm12=(iso,tz)=>fmt(tz,{hour:'numeric',minute:'2-digit'}).format(new Date(iso))
export const hm24=(iso,tz)=>fmt(tz,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'},'en-GB').format(new Date(iso))
export const dateLabel=d=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'}).format(new Date(d+'T12:00:00Z'))
export function groupSlots(slots,tz){const g={};for(const s of slots){((g[ymd(s.start_at,tz)]??={})[s.period]??=[]).push(s)}return g}
export function dayState(list){const t=list.length;if(!t)return'none';const open=list.filter(s=>s.state==='open').length
 if(open===t)return'available';if(open>0)return'partial';return list.every(s=>s.state==='unavailable')?'unavailable':'full'}
export function monthGrid(y,m){const pad=new Date(Date.UTC(y,m,1)).getUTCDay(),n=new Date(Date.UTC(y,m+1,0)).getUTCDate(),c=Array(pad).fill(null)
 for(let d=1;d<=n;d++)c.push(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);while(c.length%7)c.push(null)
 const w=[];for(let i=0;i<c.length;i+=7)w.push(c.slice(i,i+7));return w}
export const secondsLeft=(endMs,nowMs)=>Math.max(0,Math.ceil((endMs-nowMs)/1000))
export const validText=(s,max)=>{const t=String(s??'').trim();return t.length>=1&&t.length<=max}
export const canCancel=(startMs,nowMs)=>startMs-nowMs>=24*3600*1000
export const STATE_LABEL={open:'Available',held:'Held (someone is booking)',booked:'Booked',unavailable:'Unavailable'}
