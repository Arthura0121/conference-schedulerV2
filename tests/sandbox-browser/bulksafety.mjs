// v2.4.3: UI-level bulk safety. Fake backend (NOT Supabase). Run: node tests/sandbox-browser/bulksafety.mjs
// Proves: (1) the dialog's list is frozen when it opens, so a live refresh cannot change what "Close all shown" runs on; (2) selected rows hidden by a filter are announced;
// (3) if the schedule changes between preview and confirm, the teacher gets an understandable message and the changed appointment is left alone.
import {startHarness} from './lib.mjs'
const H=await startHarness(),results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms))
const ok=(n,c,d='')=>{results.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  '+d))}
const until=async(f,ms=4000)=>{const t=Date.now();while(Date.now()-t<ms){if(await f())return true;await sleep(60)}return false}
async function open(){
 const ctx=await H.browser.newContext({viewport:{width:1280,height:900}}),p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(String(e)))
 await p.goto(H.base+'#admin');await p.getByLabel('Email').fill('t@example.test');await p.getByLabel('Password').fill('x');await p.getByRole('button',{name:'Sign in'}).click();await p.getByRole('button',{name:'Refresh now'}).waitFor()
 // 6 FUTURE slots (all "Closed by teacher": eligible for opening; 3 open ones are eligible for closing). Dates are 30+ days after today, inside the default range.
 await p.evaluate(()=>{const D=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);window.__db.slots.length=0;for(let i=0;i<6;i++)window.__db.slots.push({id:'f'+i,slot_date:D(30+i),period:3,start_at:D(30+i)+'T14:00:00Z',end_at:D(30+i)+'T14:10:00Z',room:'ROOM'+(i%2),available:i<3,draft:false,reason:i<3?null:'Closed by teacher'})})
 await p.getByRole('button',{name:'Schedule',exact:true}).click();await p.getByRole('button',{name:'Refresh now'}).click();await p.locator('.srow').nth(5).waitFor()
 return p}
const bar=p=>p.locator('.bulkbar').innerText().catch(()=>'')
try{
 // ---- (2) hidden-by-filter selection ----
 let p=await open()
 await p.locator('.srow-wrap').nth(0).locator('input').check();await p.locator('.srow-wrap').nth(1).locator('input').check()   // ROOM0 and ROOM1
 ok('2 selected rows are counted; nothing hidden yet',await until(async()=>/2 selected/.test(await bar(p))&&!/hidden/.test(await bar(p))))
 await p.locator('label.mini:has(span:text-is("Room")) select').selectOption('ROOM0')   // hides the ROOM1 row that is still selected
 ok('a selected row hidden by a filter is announced on the toolbar and in the count line',await until(async()=>/1 hidden by filters/.test(await bar(p))&&/\(1 hidden by filters\)/.test(await p.locator('.count-line').innerText())),await bar(p))
 await p.getByRole('button',{name:'Close selected'}).click()
 ok('the confirmation names the hidden selected row, so the teacher knows it is included',await until(async()=>/1 of them hidden by the current filters/.test(await p.locator('dialog[open]').innerText().catch(()=>''))))
 await p.keyboard.press('Escape');await p.context().close()
 // ---- (1) frozen dialog list ----
 p=await open();await p.locator('label.mini:has(span:text-is("Room")) select').selectOption('ROOM0')           // shows f0,f2,f4
 await p.getByRole('button',{name:/Close all shown/}).click()
 ok('preview counts the 3 shown appointments',await until(async()=>/Total selected\s*3/.test((await p.locator('dialog[open]').innerText().catch(()=>'')).replace(/\n/g,' '))))
 // while the dialog is open, ANOTHER teacher adds a matching, open ROOM0 slot and a live signal refreshes the page behind the dialog
 await p.evaluate(()=>{{const d=new Date(Date.now()+40*864e5).toISOString().slice(0,10);window.__db.slots.push({id:'late',slot_date:d,period:3,start_at:d+'T14:00:00Z',end_at:d+'T14:10:00Z',room:'ROOM0',available:true,draft:false,reason:null})};window.__rt.signal('slots')})
 await sleep(1200)
 ok('the live refresh really happened behind the dialog (list now has 4 shown)',await p.evaluate(()=>document.querySelectorAll('.srow').length)===4)
 ok('the dialog title and numbers still describe the ORIGINAL 3 appointments',/Close 3 appointments\?/.test(await p.locator('dialog[open] h2').innerText())&&/Total selected\s*3/.test((await p.locator('dialog[open]').innerText()).replace(/\n/g,' ')))
 // ---- (3) stale preview: one previewed appointment gets booked by a student before the teacher confirms ----
 await p.evaluate(()=>window.__db.books.push({slot_id:'f0',student_name:'Synthetic Student',assignment:'Synthetic essay'}))
 const before=await p.evaluate(()=>window.__db.slots.map(s=>[s.id,s.available]))
 await p.locator('dialog[open]').getByRole('button',{name:/^Close \d+ appointment/}).click()
 ok('the late-added appointment was NOT closed (the action ran on the frozen list)',await until(async()=>await p.evaluate(()=>window.__db.slots.find(s=>s.id==='late').available===true&&window.__db.slots.find(s=>s.id==='f0').available===true)))
 ok('the other two previewed appointments WERE closed',await p.evaluate(()=>['f2','f4'].every(i=>window.__db.slots.find(s=>s.id===i).available===false)))
 ok('the teacher is told plainly that the schedule changed since the preview',await until(async()=>/The preview said \d+, but the schedule changed in the meantime/.test(await p.locator('body').innerText())),await p.locator('.toasts').innerText().catch(()=>''))
 ok('the booking was not cancelled',await p.evaluate(()=>window.__db.books.length===1))
 ok('no page errors',p.errs.length===0,p.errs.join(';'));await p.context().close()
}finally{await H.close()}
const bad=results.filter(r=>!r[1]);console.log(`\n${results.length-bad.length}/${results.length} checks passed`);process.exit(bad.length?1:0)
