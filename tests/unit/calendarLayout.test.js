import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8')

test('calendar finishing stylesheet is loaded after prior student theme layers',()=>{
 const app=read('src/App.jsx')
 const marker="import './styles/calendar-layout.css'"
 assert.ok(app.includes(marker))
 assert.ok(app.indexOf(marker)>app.indexOf("import './styles/seasonal-components.css'"))
 assert.ok(app.indexOf(marker)>app.indexOf("import './styles/themes.css'"))
 assert.doesNotMatch(read('src/Admin.jsx'),/import '\.\/styles\/calendar-layout.css'/)
})
test('phone calendar has full-width heading and two-row action layout',()=>{
 const css=read('src/styles/calendar-layout.css')
 for(const x of ['@media(max-width:767px)','grid-template-columns:minmax(0,1fr)!important','grid-template-rows:44px 44px!important','grid-column:1!important','grid-column:2!important','min-height:44px!important','margin:0 0 15px!important']){
  assert.ok(css.includes(x),x)
 }
 const month=read('src/student/MonthCalendar.jsx')
 assert.match(month,/className="ad-fast-head"/)
 assert.match(month,/className="ad-fast-title"/)
 assert.match(month,/className="ad-fast-actions"/)
 assert.match(month,/className="ad-nav-arrows"/)
})
test('phone period filters are visible and do not scroll out of the card',()=>{
 const css=read('src/styles/calendar-layout.css'),jsx=read('src/student/PeriodFilter.jsx')
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(css,/overflow:visible/)
 assert.match(css,/\.student-period-chip>small/)
 assert.match(jsx,/aria-pressed=\{value === String\(p\)\}/)
})
test('month days remain a seven-column keyboard-operable accessible grid',()=>{
 const css=read('src/styles/calendar-layout.css'),jsx=read('src/student/MonthCalendar.jsx')
 assert.match(css,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/)
 assert.match(css,/min-height:clamp\(56px,13vw,76px\)!important/)
 assert.match(css,/\.day:focus-visible/)
 assert.match(jsx,/onKeyDown=\{onKey\}/)
 assert.match(jsx,/aria-pressed=\{d===date\}/)
 assert.match(jsx,/aria-current=\{d===today\?'date':undefined\}/)
})
test('desktop month heading is prominent and landscape phones remain compact',()=>{
 const css=read('src/styles/calendar-layout.css')
 assert.match(css,/font-size:clamp\(2\.35rem,3\.4vw,3\.35rem\)/)
 assert.match(css,/@media\(min-width:768px\) and \(max-width:1199px\)/)
 assert.match(css,/@media\(max-width:767px\) and \(orientation:landscape\) and \(max-height:520px\)/)
 assert.ok(!/\[data-theme=/.test(css),'layout must not hard-code per-theme surfaces')
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length)
})
