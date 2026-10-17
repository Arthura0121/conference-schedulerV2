import test from 'node:test';import assert from 'node:assert/strict'
import {TAB_CALLS,loadTab,isAuthError,formKey} from '../../src/adminData.js'
import {startPolling} from '../../src/poll.js'
// A fake backend that behaves like the teacher RPCs: slots, bookings, settings. Records every call.
function backend(){const db={slots:[{id:'s1',slot_date:'2026-10-20',period:3,room:'T1',available:true,draft:false,held:false,booked:false}],books:[],cfg:{lock_message:'Back soon',policy:'Rules',auto_lock_on_edit:false,tz:'America/New_York',edit_lock_until:null}},calls=[]
  const call=async(fn,args)=>{calls.push([fn,args]);switch(fn){case 'admin_stats':return{total:db.slots.length,booked:db.books.length};case 'admin_events':return[];case 'admin_settings':return{...db.cfg}
   case 'admin_slots':return db.slots.map(s=>({...s}));case 'admin_bookings':return db.books.map(b=>({...b}));default:throw new Error('unexpected '+fn)}}
  return{db,calls,call,book(id,name){const s=db.slots.find(x=>x.id===id);s.booked=true;db.books.push({slot_id:id,student_name:name})},cancel(id){db.slots.find(x=>x.id===id).booked=false;db.books=db.books.filter(b=>b.slot_id!==id)}}}
const range={from:'2026-10-01',to:'2026-10-31'}
test('every teacher tab has a data source that is part of the refresh (root-cause regression: Bookings/Schedule data was fetched once)',()=>{assert.ok(TAB_CALLS.book.includes('admin_bookings'));assert.ok(TAB_CALLS.sched.includes('admin_slots'));assert.ok(TAB_CALLS.dash.includes('admin_stats'));assert.ok(TAB_CALLS.set.includes('admin_settings'))
  for(const t of Object.keys(TAB_CALLS))assert.ok(TAB_CALLS[t].includes('admin_settings'),t+' needs settings for the edit-lock banner')})
test('loadTab calls only what the tab needs, with the date range',async()=>{const b=backend();await loadTab('sched',range,b.call);assert.deepEqual(b.calls.map(c=>c[0]).sort(),['admin_settings','admin_slots']);assert.deepEqual(b.calls.find(c=>c[0]==='admin_slots')[1],{p_from:range.from,p_to:range.to})})
test('SCENARIO (your steps 3-8): booking, cancellation and re-booking reach the teacher views on the next poll, with no manual refresh',async()=>{
  const b=backend(),view={books:null,slots:null};let timers=[],stop;const fakeSetInterval=(fn)=>{timers.push(fn);return timers.length}
  const refresh=async()=>{const d=await loadTab('book',range,b.call);view.books=d.books;view.slots=d.slots}
  stop=startPolling({refresh,intervalMs:5000,doc:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},win:{addEventListener(){},removeEventListener(){}},setIntervalFn:fakeSetInterval,clearIntervalFn(){}})
  await new Promise(r=>setImmediate(r));assert.equal(view.books.length,0,'teacher page loaded: no bookings yet')
  const tick=async()=>{timers[0]();await new Promise(r=>setImmediate(r))}
  b.book('s1','Student A');await tick();assert.deepEqual(view.books.map(x=>x.student_name),['Student A'],'student booking appears on Bookings after a poll')
  b.cancel('s1');await tick();assert.equal(view.books.length,0,'cancellation removes it from Bookings');assert.equal(view.slots.length,1,'slot stays in Schedule');assert.equal(view.slots[0].booked,false,'and shows as free again')
  b.book('s1','Student B');await tick();assert.equal(view.books[0].student_name,'Student B','re-booking appears without refresh')
  b.db.slots.push({id:'s2',slot_date:'2026-10-21',period:5,room:'T2',available:true,booked:false});await tick();assert.equal(view.slots.length,2,'a slot created by another teacher browser appears');b.db.slots=b.db.slots.filter(s=>s.id!=='s2');await tick();assert.equal(view.slots.length,1,'a deleted slot disappears')
  stop()})
test('a network failure is NOT an auth failure (teacher must not be sent to the sign-in page)',()=>{for(const m of ['TypeError: Failed to fetch','NetworkError when attempting to fetch resource.','timeout','Internal Server Error'])assert.equal(isAuthError({message:m}),false,m);assert.equal(isAuthError(null),false)})
test('real auth problems are recognised',()=>{assert.equal(isAuthError({message:'JWT expired',code:'PGRST301'}),true);assert.equal(isAuthError({message:'forbidden'}),true);assert.equal(isAuthError({code:'PGRST303',message:'x'}),true);assert.equal(isAuthError({message:'invalid token'}),true)})
test('settings form is re-synced only when its own fields change, so polling cannot overwrite typing',()=>{const c={lock_message:'a',policy:'p',auto_lock_on_edit:false,tz:'America/New_York',edit_lock_until:null,lock_from:null};const k=formKey(c);assert.equal(formKey({...c,edit_lock_until:'2026-10-20T10:00:00Z',lock_from:'x',locked:true}),k);assert.notEqual(formKey({...c,policy:'q'}),k);assert.notEqual(formKey({...c,auto_lock_on_edit:true}),k);assert.equal(formKey(null),'')})
