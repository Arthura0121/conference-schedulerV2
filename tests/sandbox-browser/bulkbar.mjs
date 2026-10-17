// v2.4.3 regression: the floating bulk toolbar must never hide the last appointment. Measures REAL rectangles and scroll positions (no screenshots).
// Runs against the fake backend (see lib.mjs). Run: node tests/sandbox-browser/bulkbar.mjs
import {startHarness} from './lib.mjs'
const H=await startHarness(),results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms))
const ok=(n,c,d='')=>{results.push([n,!!c]);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  '+d))}
const GAP=12   // required visible gap between the last row's bottom edge and the toolbar's top edge
const WIDTHS=[[320,640],[375,740],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]
async function open(w,h,{vv=false,safeB=0}={}){
 const ctx=await H.browser.newContext({viewport:{width:w,height:h}}),p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(String(e)))
 if(vv)await p.addInitScript(()=>{const l={resize:new Set(),scroll:new Set()};window.__vv={height:innerHeight,offsetTop:0,addEventListener:(e,f)=>l[e]?.add(f),removeEventListener:(e,f)=>l[e]?.delete(f),fire(){l.resize.forEach(f=>f())}};Object.defineProperty(window,'visualViewport',{configurable:true,get:()=>window.__vv})})
 await p.clock.install({time:new Date('2026-10-13T12:00:00Z')});await p.goto(H.base+'#admin')
 await p.getByLabel('Email').fill('t@example.test');await p.getByLabel('Password').fill('x');await p.getByRole('button',{name:'Sign in'}).click()
 await p.getByRole('button',{name:'Refresh now'}).waitFor()
 if(safeB)await p.addStyleTag({content:`:root{--safe-b:${safeB}px!important}`})
 // 40 upcoming appointments across 8 days so the list is far taller than any viewport
 await p.evaluate(()=>{for(let i=0;i<40;i++){const d=`2026-10-${String(20+Math.floor(i/5)).padStart(2,'0')}`,m=10+(i%5)*15;window.__db.slots.push({id:'x'+i,slot_date:d,period:3+(i%5),start_at:`${d}T${String(13+Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00Z`,end_at:`${d}T${String(13+Math.floor((m+10)/60)).padStart(2,'0')}:${String((m+10)%60).padStart(2,'0')}:00Z`,room:'RM'+i,available:i%2===0,draft:false,reason:i%2?'Not available':null})}})
 await p.getByRole('button',{name:'Schedule',exact:true}).click();await p.getByRole('button',{name:'Refresh now'}).click()
 await p.getByRole('button',{name:'Upcoming',exact:true}).click();await p.locator('.srow').nth(30).waitFor()
 // .sday uses content-visibility:auto, so section heights are ESTIMATES until scrolled past. Settle first so before/after measurements compare like with like.
 await scrollEnd(p)
 await p.evaluate(()=>{const m=document.querySelector('.tapp.wide .tmain');m?(m.scrollTop=0):window.scrollTo(0,0)});await sleep(120);return p}
const scrollOnce=p=>p.evaluate(()=>{const m=document.querySelector('.tapp.wide .tmain'),el=m||document.documentElement;if(m)m.scrollTop=m.scrollHeight;else window.scrollTo(0,document.documentElement.scrollHeight);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(el.scrollHeight))))})
// scroll to the true end: repeat until the height stops changing (content-visibility sections settle as they are reached)
const scrollEnd=async p=>{let last=-1;for(let i=0;i<8;i++){const h=await scrollOnce(p);await sleep(60);if(h===last&&i>0)break;last=h}}
const scrollPos=p=>p.evaluate(()=>{const m=document.querySelector('.tapp.wide .tmain');return m?m.scrollTop:window.scrollY})
const geo=async p=>{await p.evaluate(()=>Promise.all((document.querySelector('.bulkbar')?.getAnimations()||[]).map(a=>a.finished)));return geo0(p)}
const geo0=p=>p.evaluate(()=>{const R=e=>{const r=e.getBoundingClientRect();return {t:r.top,b:r.bottom,l:r.left,r:r.right}},rows=[...document.querySelectorAll('.srow')],last=rows[rows.length-1],bar=document.querySelector('.bulkbar'),nav=document.querySelector('nav.bnav'),vh=window.innerHeight
 const btns=bar?[...bar.querySelectorAll('button')].map(b=>({...R(b),hit:(()=>{const r=b.getBoundingClientRect(),e=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return !!e&&(e===b||b.contains(e))})()})):[]
 const lastBox=document.querySelector('.srow-wrap:last-child')&&[...document.querySelectorAll('.srow-wrap')].pop()
 const lr=R(last),cx=(lr.l+lr.r)/2,cy=(lr.t+lr.b)/2,hitEl=document.elementFromPoint(cx,cy)
 return {vh,vw:window.innerWidth,last:lr,lastHit:!!hitEl&&last.contains(hitEl),bar:bar&&R(bar),nav:nav&&R(nav),btns,overflowX:document.documentElement.scrollWidth-window.innerWidth,cls:document.body.classList.contains('bulk-active'),
  vars:['--bulkbar-h','--bnav-h','--kb'].map(k=>document.documentElement.style.getPropertyValue(k)),docH:document.documentElement.scrollHeight,tmainPb:parseFloat(getComputedStyle(document.querySelector('.tmain')).paddingBottom)}})
const overlap=(a,b)=>a.l<b.r-0.5&&b.l<a.r-0.5&&a.t<b.b-0.5&&b.t<a.b-0.5
// Tap the last row's checkbox exactly like a finger: first prove it is on screen and not covered (elementFromPoint), then click WITHOUT any programmatic scrolling
// (Playwright's own check() may scroll the element into view, which would hide a real scroll jump or invent a fake one).
const pickLast=async p=>{await scrollEnd(p);const before=await scrollPos(p)
 const hit=await p.evaluate(()=>{const c=[...document.querySelectorAll('.srow-wrap')].pop().querySelector('input[type=checkbox]'),r=c.getBoundingClientRect(),e=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return r.top>=0&&r.bottom<=innerHeight&&!!e&&(e===c||c.parentElement.contains(e))})
 if(!hit)throw new Error('last checkbox is not tappable before selecting')
 await p.evaluate(()=>[...document.querySelectorAll('.srow-wrap')].pop().querySelector('input[type=checkbox]').click());await sleep(250);return before}
const lastTop=p=>p.evaluate(()=>[...document.querySelectorAll('.srow')].pop().getBoundingClientRect().top)
try{
 for(const [w,h] of WIDTHS){
  const p=await open(w,h),T=`${w}px`
  const base=await geo(p);ok(`${T} no bulk bar and no reserved space before selecting`,!base.bar&&!base.cls&&base.vars.every(v=>v===''))
  await scrollEnd(p);const topBefore=await lastTop(p),before=await pickLast(p),after=await scrollPos(p),topAfter=await lastTop(p);const g=await geo(p)
  ok(`${T} selecting causes no visible jump: the list stays where the user sees it (last row moved <= 2px on screen)`,Math.abs(topAfter-topBefore)<=2,`row top ${topBefore} -> ${topAfter}; scrollY ${before} -> ${after}`)
  ok(`${T} toolbar is rendered, inside the viewport, and body.bulk-active + vars are set`,g.bar&&g.bar.t>=0&&g.bar.b<=g.vh+0.5&&g.cls&&g.vars[0]!=='',JSON.stringify(g.bar)+g.vars)
  await scrollEnd(p);const e=await geo(p)
  ok(`${T} measured --bulkbar-h equals the real toolbar height`,Math.abs(parseFloat(e.vars[0])-(e.bar.b-e.bar.t))<=1.5,e.vars[0]+' vs '+(e.bar.b-e.bar.t))
  ok(`${T} REQUIRED: last appointment's bottom edge is above the toolbar top by >= ${GAP}px`,e.last.b<=e.bar.t-GAP,`last.bottom=${e.last.b} bar.top=${e.bar.t}`)
  ok(`${T} last appointment is fully on screen and receives clicks (not covered)`,e.last.t>=0&&e.lastHit,JSON.stringify(e.last)+e.lastHit)
  if(e.nav)ok(`${T} toolbar sits above the bottom tabs (no overlap, gap kept)`,e.bar.b<=e.nav.t+0.5&&!overlap(e.bar,e.nav),JSON.stringify({bar:e.bar,nav:e.nav}))
  ok(`${T} all 3 toolbar buttons are inside the bar, on screen, tappable and mutually non-overlapping`,e.btns.length===3&&e.btns.every(b=>b.l>=e.bar.l-0.5&&b.r<=e.bar.r+0.5&&b.t>=e.bar.t-0.5&&b.b<=e.bar.b+0.5&&b.l>=0&&b.r<=e.vw+0.5&&b.hit)&&e.btns.every((a,i)=>e.btns.every((c,j)=>i>=j||!overlap(a,c))),JSON.stringify(e.btns))
  ok(`${T} no horizontal overflow`,e.overflowX<=1,String(e.overflowX))
  await p.getByRole('button',{name:'Clear selection'}).click();await sleep(250);const c=await geo(p)
  ok(`${T} clearing removes the toolbar, the class, the variables and the extra space`,!c.bar&&!c.cls&&c.vars.every(v=>v==='')&&Math.abs(c.tmainPb-base.tmainPb)<=1&&Math.abs(c.docH-base.docH)<=1,JSON.stringify({bar:c.bar,cls:c.cls,vars:c.vars,pb:[c.tmainPb,base.tmainPb],h:[c.docH,base.docH]}))
  ok(`${T} no uncaught page errors`,p.errs.length===0,p.errs.join(';'));await p.context().close()}
 // ---- phone-only extras ----
 { const p=await open(375,740);await pickLast(p);await scrollEnd(p)
  await p.setViewportSize({width:320,height:640});await sleep(300);await scrollEnd(p);let e=await geo(p)
  ok('rotating/resizing 375 -> 320 while selected re-measures: last row still clear of the (taller) toolbar',e.last.b<=e.bar.t-GAP&&Math.abs(parseFloat(e.vars[0])-(e.bar.b-e.bar.t))<=1.5,JSON.stringify(e.last)+JSON.stringify(e.bar))
  await p.setViewportSize({width:667,height:375});await sleep(300);await scrollEnd(p);e=await geo(p)
  ok('landscape phone 667x375: last row clear of the toolbar, toolbar not taller than the screen',e.last.b<=e.bar.t-GAP&&e.bar.t>=0&&e.bar.b<=e.vh+0.5,JSON.stringify(e.last)+JSON.stringify(e.bar))
  await p.context().close() }
 { const p=await open(375,740,{safeB:34});await pickLast(p);await scrollEnd(p);const e=await geo(p)   // iPhone home-indicator inset
  ok('simulated 34px bottom safe-area: tabs grow, toolbar rides above them, last row still clear',e.nav&&(e.nav.b-e.nav.t)>=90&&e.bar.b<=e.nav.t+0.5&&e.last.b<=e.bar.t-GAP,JSON.stringify(e))
  await p.context().close() }
 { const p=await open(375,740,{vv:true});await pickLast(p);await p.evaluate(()=>{window.__vv.height=innerHeight-300;window.__vv.fire()});await sleep(300);await scrollEnd(p);const e=await geo(p)   // simulated on-screen keyboard (300px)
  ok('simulated 300px keyboard: toolbar moves up above the keyboard line and stays fully visible',e.bar.b<=740-300+0.5&&e.bar.t>=0&&e.vars[2]==='300px',JSON.stringify(e.bar)+e.vars)
  ok('simulated keyboard: last row can still be scrolled clear of the toolbar',e.last.b<=e.bar.t-GAP,JSON.stringify(e.last))
  await p.evaluate(()=>{window.__vv.height=innerHeight-60;window.__vv.fire()});await sleep(200);const s=await geo(p)
  ok('a 60px viewport change (browser URL bar) is NOT treated as a keyboard',s.vars[2]==='0px'&&s.nav&&s.bar.b<=s.nav.t+0.5,JSON.stringify(s.vars))
  await p.context().close() }
 // ---- negative control: prove this test can fail. Re-inject the v2.4.2 rule (fixed 150px guess) and the same measurement must FAIL at 375px ----
 { const p=await open(375,740);await p.addStyleTag({content:'body.bulk-active .tapp:not(.wide) .tmain{padding-bottom:calc(150px + var(--safe-b))!important}'});await pickLast(p);await scrollEnd(p);const e=await geo(p)
  ok('NEGATIVE CONTROL: with the old 150px padding the same assertion FAILS (last row hidden behind toolbar), so the test has teeth',!(e.last.b<=e.bar.t-GAP),`last.bottom=${e.last.b} bar.top=${e.bar.t}`)
  await p.context().close() }
}finally{await H.close()}
const bad=results.filter(r=>!r[1]);console.log(`\n${results.length-bad.length}/${results.length} checks passed`);process.exit(bad.length?1:0)
