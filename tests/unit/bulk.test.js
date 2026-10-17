import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs'
import {classifyForBulk,bulkPreview,toggleId,selectAll,deselectAll,pruneSelection,selectedSlots,scopeText,bulkExplain,overLimit,MAX_BULK,protectedCount} from '../../src/bulk.js'
import {filterSlots,PAPER_MARK} from '../../src/slotInfo.js'
const NOW=Date.parse('2026-10-15T12:00:00Z')
// Rebuild the REAL imported schedule (60 day/period rows x 3 slots = 180) from the PDF-derived fixture.
const grid=JSON.parse(fs.readFileSync(new URL('../fixtures/pdf_grid.json',import.meta.url),'utf8'))
const slots=grid.flatMap(g=>[...g.code].map((c,i)=>({id:`${g.date}-${g.period}-${i}`,slot_date:g.date,period:g.period,room:g.period===7?'436B':g.period===3?'407':'422',start_at:`${g.date}T${String(9+g.period).padStart(2,'0')}:${i}0:00Z`,
  available:c==='O',reason:c==='N'?'Not available':c==='P'?PAPER_MARK:null,draft:false,held:false,booked:false})))
const future=s=>Date.parse(s.start_at)>NOW
test('fixture matches the documented sheet: 180 slots, 70 N, 109 P, 1 open',()=>{assert.equal(slots.length,180);assert.equal(slots.filter(s=>s.reason==='Not available').length,70);assert.equal(slots.filter(s=>s.reason===PAPER_MARK).length,109);assert.equal(slots.filter(s=>s.available).length,1)})
test('OPEN ALL on the real imported data: paper-reserved are NEVER eligible; past are never eligible; imported "Not available" need explicit opt-in',()=>{
  const a=bulkPreview(slots,true,{nowMs:NOW});const fp=slots.filter(s=>s.reason===PAPER_MARK&&future(s)).length;assert.equal(a.paper,fp);assert.equal(a.eligible,0,'without opt-in nothing changes');assert.equal(a.needs_opt_in,slots.filter(s=>s.reason==='Not available'&&future(s)).length)
  const b=bulkPreview(slots,true,{includeOther:true,nowMs:NOW});assert.equal(b.eligible,slots.filter(s=>s.reason==='Not available'&&future(s)).length);assert.equal(b.paper,fp)
  const ids=new Set(b.eligibleIds);for(const s of slots){if(ids.has(s.id)){assert.notEqual(s.reason,PAPER_MARK);assert.ok(future(s))}}
  assert.equal(b.requested,180);assert.equal(b.past+b.paper+b.already_open+b.eligible+b.needs_opt_in+b.booked+b.draft+b.already_closed,180,'every slot is accounted for exactly once')})
test('the single open appointment is in the past: CLOSE ALL does not touch it',()=>{const c=bulkPreview(slots,false,{nowMs:NOW});assert.equal(c.eligible,0);assert.equal(c.past>=1,true)})
test('classification order mirrors SQL: past > draft > booked > paper > already-state > needs opt-in > eligible',()=>{
  const base={id:'a',slot_date:'2026-11-01',start_at:'2026-11-01T15:00:00Z',available:false,reason:'Closed by teacher',draft:false,booked:false,held:false}
  assert.equal(classifyForBulk({...base,start_at:'2026-10-01T15:00:00Z',booked:true},true,true,NOW),'past')
  assert.equal(classifyForBulk({...base,draft:true,booked:true},true,true,NOW),'draft');assert.equal(classifyForBulk({...base,booked:true,available:true},false,true,NOW),'booked')
  assert.equal(classifyForBulk({...base,reason:PAPER_MARK},true,true,NOW),'paper');assert.equal(classifyForBulk({...base,reason:PAPER_MARK},false,true,NOW),'paper','paper stays protected when closing too')
  assert.equal(classifyForBulk({...base,available:true,reason:null},true,false,NOW),'already_open');assert.equal(classifyForBulk(base,false,false,NOW),'already_closed')
  assert.equal(classifyForBulk({...base,reason:'Not available'},true,false,NOW),'needs_opt_in');assert.equal(classifyForBulk({...base,reason:'Not available'},true,true,NOW),'eligible');assert.equal(classifyForBulk(base,true,false,NOW),'eligible','closed by teacher reopens without opt-in')
  assert.equal(classifyForBulk({...base,available:true,reason:null},false,false,NOW),'eligible')})
test('existing online bookings are never eligible for open OR close (no automatic cancellation)',()=>{const b={id:'b',start_at:'2026-11-01T15:00:00Z',available:true,booked:true,draft:false,reason:null};for(const v of [true,false])assert.equal(classifyForBulk(b,v,true,NOW),'booked')})
test('closing counts active holds that will be released; opening never does',()=>{const o={id:'h',start_at:'2026-11-01T15:00:00Z',available:true,held:true,draft:false,booked:false,reason:null};assert.equal(bulkPreview([o],false,{nowMs:NOW}).held_released,1);assert.equal(bulkPreview([o],true,{nowMs:NOW}).held_released,0)})
test('selection helpers: toggle, select all shown, deselect all, prune vanished ids, and selectedSlots',()=>{
  let s=deselectAll();s=toggleId(s,'x');assert.deepEqual([...s],['x']);s=toggleId(s,'x');assert.equal(s.size,0);const sh=slots.slice(0,5);s=selectAll(s,sh);assert.equal(s.size,5);s=pruneSelection(s,sh.slice(0,2));assert.equal(s.size,2);assert.equal(selectedSlots(s,slots).length,2);assert.equal(deselectAll().size,0)})
test('selection by date range, period, status and room (filters used by Select all shown)',()=>{
  assert.equal(filterSlots(slots,{from:'2026-10-13',to:'2026-10-15'},NOW).every(s=>s.slot_date>='2026-10-13'&&s.slot_date<='2026-10-15'),true)
  assert.equal(filterSlots(slots,{period:'7'},NOW).every(s=>s.period===7),true);assert.equal(filterSlots(slots,{room:'436B'},NOW).length,slots.filter(s=>s.room==='436B').length)
  assert.equal(filterSlots(slots,{status:'paper'},NOW).length,109);assert.equal(filterSlots(slots,{status:'closed'},NOW).length,70);assert.equal(filterSlots(slots,{status:'open'},NOW).length,1)
  const combo=filterSlots(slots,{from:'2026-10-13',to:'2026-10-16',period:'5',room:'422',status:'closed'},NOW);assert.ok(combo.every(s=>s.period===5&&s.room==='422'&&s.reason==='Not available'&&s.slot_date>='2026-10-13'))})
test('scope text names exactly what "all" means; never a vague "all appointments"',()=>{
  assert.match(scopeText({mode:'shown',count:12,f:{from:'2026-10-13',to:'2026-10-16',status:'closed',period:'5',room:'422',q:''}}),/all 12 appointments currently shown \(2026-10-13 to 2026-10-16, status “closed”, period 5, room 422\)/)
  assert.equal(scopeText({mode:'selected',count:1}),'1 selected appointment');assert.equal(overLimit(MAX_BULK+1),true);assert.equal(overLimit(MAX_BULK),false)})
test('explanation states consequences, including protected categories and lost holds',()=>{const t=bulkExplain(false,{eligible:3,held_released:1,paper:2,booked:1,past:4,draft:1});assert.match(t,/3 appointments will close/);assert.match(t,/lose that 60-second hold/);assert.match(t,/2 taken on paper stay untouched/);assert.match(t,/no booking is cancelled/);assert.match(t,/4 in the past/);assert.match(bulkExplain(true,{eligible:1,paper:0,booked:0,past:0,draft:0}),/1 appointment will open/)})
test('protectedCount counts past, draft, booked and paper',()=>{assert.equal(protectedCount(slots,NOW),slots.filter(s=>!future(s)||s.reason===PAPER_MARK).length)})
test('UI never executes without the dialog: the only call sites of the bulk RPC are the preview and the confirm button, and the dialog shows the server preview first',()=>{
  const d=fs.readFileSync(new URL('../../src/teacher/BulkDialog.jsx',import.meta.url),'utf8'),sc=fs.readFileSync(new URL('../../src/teacher/Schedule.jsx',import.meta.url),'utf8')
  assert.equal((d.match(/admin_bulk_set_available/g)||[]).length,2);assert.match(d,/p_dry_run: true/);assert.match(d,/p_dry_run: false/);assert.doesNotMatch(sc,/admin_bulk_set_available/,'Schedule itself never runs a bulk action')
  assert.match(d,/disabled=\{!r \|\| r\.eligible === 0/,'confirm disabled until the server preview arrived');assert.doesNotMatch(d+sc,/\b(?:alert|confirm|prompt)\(/)})
