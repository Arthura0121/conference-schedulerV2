// Live-sync controller tests. Uses a FAKE Supabase client and fake timers: these verify OUR logic (subscription, refetch, reconnect, coalescing, cleanup, fallback).
// They are NOT tests against real Supabase Realtime (see TESTING.md: real two-browser tests were not run in this build environment).
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs'
import {startRealtime,isSignal,nextCheckMs,TOPIC_PUBLIC,TOPIC_ADMIN,EVENT,HOLD_MS} from '../../src/realtime.js'
const tick=()=>new Promise(r=>setImmediate(r))
function rig({online=true}={}){
  const timers=new Map();let tid=0,clock=1000
  const T={setT:(f,ms)=>{const id=++tid;timers.set(id,{f,at:clock+ms,iv:null});return id},clearT:id=>timers.delete(id),setI:(f,ms)=>{const id=++tid;timers.set(id,{f,at:clock+ms,iv:ms});return id},clearI:id=>timers.delete(id),now:()=>clock}
  const advance=async ms=>{const end=clock+ms;for(;;){const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;const [id,t]=due;clock=Math.max(clock,t.at);if(t.iv)t.at+=t.iv;else timers.delete(id);t.f();await tick()}clock=end}
  const listeners={};const win={navigator:{onLine:online},addEventListener:(e,f)=>(listeners[e]??=new Set()).add(f),removeEventListener:(e,f)=>listeners[e]?.delete(f)}
  const doc={visibilityState:'visible',addEventListener:(e,f)=>(listeners['d'+e]??=new Set()).add(f),removeEventListener:(e,f)=>listeners['d'+e]?.delete(f)}
  const ch={handlers:[],cb:null,topic:null,opts:null,on(t,f,h){this.handlers.push([t,f,h]);return this},subscribe(cb){this.cb=cb;return this}}
  const channels=[],removed=[];let auths=0
  const client={realtime:{setAuth:async()=>{auths++}},channel(topic,opts){const c=Object.create(ch);c.handlers=[];c.topic=topic;c.opts=opts;channels.push(c);return c},removeChannel(c){removed.push(c)}}
  const emit=(c,payload)=>c.handlers.forEach(([t,f,h])=>t==='broadcast'&&f.event===EVENT&&h({payload}))
  return{T,advance,listeners,win,doc,client,channels,removed,emit,get auths(){return auths},setOnline:v=>{win.navigator.onLine=v}}
}
const mk=(r,over={})=>{let calls=0,statuses=[],gate=null;const refresh=async()=>{calls++;if(gate)await gate.p;if(over.fail)throw new Error('x')}
  const h=startRealtime({client:r.client,topic:TOPIC_PUBLIC,refresh,onStatus:s=>statuses.push(s),doc:r.doc,win:r.win,...r.T,fallbackMs:15000,reconcileMs:60000,...over.opts});return{h,statuses,get calls(){return calls},hold(){let res;gate={p:new Promise(x=>res=x),res};return()=>{gate.res();gate=null}}}}

test('signal shape: only {v:1,kind} with a known kind is acted on',()=>{assert.equal(isSignal({v:1,kind:'slots'}),true);for(const bad of [null,{},{v:2,kind:'slots'},{v:1,kind:'evil'},{kind:'slots'},'slots',{v:1,kind:'slots',names:['x']}].slice(0,6))assert.equal(isSignal(bad),false,JSON.stringify(bad));})
test('subscribes to a PRIVATE channel on the right topic with self-send off, after setAuth, and fetches immediately without waiting for the socket',async()=>{
  const r=rig(),m=mk(r);assert.equal(m.calls,1,'initial fetch does not wait for the websocket');await tick();await tick()
  assert.equal(r.channels.length,1);assert.equal(r.channels[0].topic,'sched:public');assert.equal(r.channels[0].opts.config.private,true);assert.equal(r.channels[0].opts.config.broadcast.self,false);assert.equal(r.auths,1);assert.deepEqual(m.statuses,['connecting'])
  m.h.stop()})
test('refetch AFTER subscription; status is Syncing until that fetch succeeds, then Live (never Live before)',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();const before=m.calls;r.channels[0].cb('SUBSCRIBED');assert.equal(m.h.status(),'syncing');await tick();await tick()
  assert.ok(m.calls>before,'a fetch started after SUBSCRIBED');assert.equal(m.h.status(),'live');assert.deepEqual(m.statuses,['connecting','syncing','live']);m.h.stop()})
test('a fetch that FAILS after subscription does not claim Live; the fast fallback retries and then goes Live',async()=>{
  const r=rig();let fail=true,calls=0;const st=[];const h=startRealtime({client:r.client,topic:TOPIC_PUBLIC,refresh:async()=>{calls++;if(fail)throw new Error('net')},onStatus:s=>st.push(s),doc:r.doc,win:r.win,...r.T,fallbackMs:5000,reconcileMs:60000})
  await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick();assert.equal(h.status(),'syncing');assert.ok(!st.includes('live'));fail=false;await r.advance(5000);assert.equal(h.status(),'live');h.stop()})
test('a broadcast signal triggers a refetch; many signals in a burst coalesce into ONE fetch',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick();const base=m.calls
  for(let i=0;i<25;i++)r.emit(r.channels[0],{v:1,kind:i%2?'slots':'holds'});await r.advance(300);assert.equal(m.calls-base,1,'25 signals -> 1 refetch');m.h.stop()})
test('a signal arriving DURING a fetch causes exactly one follow-up fetch (no overlap, nothing lost)',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick();const base=m.calls
  const release=m.hold();r.emit(r.channels[0],{v:1,kind:'slots'});await r.advance(200);assert.equal(m.calls-base,1);r.emit(r.channels[0],{v:1,kind:'bookings'});r.emit(r.channels[0],{v:1,kind:'bookings'});await r.advance(200);assert.equal(m.calls-base,1,'still one in flight');release();await tick();await tick();await r.advance(300);assert.equal(m.calls-base,2,'one follow-up');m.h.stop()})
test('forged / malformed messages are ignored (no refetch)',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick();const base=m.calls
  for(const bad of [{v:1,kind:'drop table'},{hello:1},null,'x',{v:9,kind:'slots'}])r.emit(r.channels[0],bad);await r.advance(1000);assert.equal(m.calls,base);m.h.stop()})
test('reconnection: channel error -> Reconnecting; the rejoin SUBSCRIBED refetches (missed events recovered) and returns to Live',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick();assert.equal(m.h.status(),'live')
  r.channels[0].cb('CHANNEL_ERROR');assert.equal(m.h.status(),'reconnecting');const base=m.calls;r.channels[0].cb('TIMED_OUT');assert.equal(m.h.status(),'reconnecting')
  r.channels[0].cb('SUBSCRIBED');await tick();await tick();assert.ok(m.calls>base,'refetch after rejoin');assert.equal(m.h.status(),'live');assert.equal(r.channels.length,1,'rejoin reuses the channel: no duplicate listener');m.h.stop()})
test('fallback: while NOT live the data is polled every fallbackMs; while live only a slow reconcile runs',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();const b0=m.calls;await r.advance(15000);assert.ok(m.calls>b0,'not live -> fast polling')
  r.channels[0].cb('SUBSCRIBED');await tick();await tick();const b1=m.calls;await r.advance(30000);assert.equal(m.calls,b1,'live: no fast polling');await r.advance(40000);assert.ok(m.calls>b1,'live: slow reconcile after 60 s');m.h.stop()})
test('Realtime completely unavailable (channel never subscribes): data still refreshes by fallback polling and the badge never says Live',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();r.channels[0].cb('CHANNEL_ERROR');const b=m.calls;await r.advance(45000);assert.ok(m.calls-b>=3);assert.ok(!m.statuses.includes('live'));m.h.stop()})
test('offline / online events: Offline immediately, Reconnecting + refetch when the network returns',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick()
  r.setOnline(false);[...r.listeners.offline].forEach(f=>f());assert.equal(m.h.status(),'offline');const b=m.calls;await r.advance(20000);assert.equal(m.calls,b,'no polling while offline')
  r.setOnline(true);[...r.listeners.online].forEach(f=>f());await tick();assert.equal(m.h.status(),'reconnecting');assert.ok(m.calls>b);m.h.stop()})
test('returning to a hidden tab refetches (missed events); hidden tabs are not polled',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();const b=m.calls;r.doc.visibilityState='hidden';await r.advance(30000);assert.equal(m.calls,b);r.doc.visibilityState='visible';[...r.listeners.dvisibilitychange].forEach(f=>f());await tick();assert.ok(m.calls>b);m.h.stop()})
test('cleanup: stop() removes the channel, every listener and every timer; late callbacks do nothing',async()=>{
  const r=rig(),m=mk(r);await tick();await tick();const ch=r.channels[0];m.h.stop();assert.deepEqual(r.removed,[ch]);for(const k of Object.keys(r.listeners))assert.equal(r.listeners[k].size,0,k)
  const b=m.calls;ch.cb('SUBSCRIBED');r.emit(ch,{v:1,kind:'slots'});await r.advance(200000);assert.equal(m.calls,b);assert.equal(r.T.now()>0,true)})
test('no duplicate listeners: stop() called while setAuth is still pending never opens a channel; restart creates exactly one',async()=>{
  const r=rig();let release;r.client.realtime.setAuth=()=>new Promise(res=>release=res)
  const m=mk(r);m.h.stop();release();await tick();await tick();assert.equal(r.channels.length,0)
  const r2=rig(),a=mk(r2);await tick();await tick();a.h.stop();const b=mk(r2);await tick();await tick();assert.equal(r2.channels.length,2);assert.equal(r2.removed.length,1)
  b.h.stop();assert.equal(r2.removed.length,2)})
test('nudge: re-check at a hold expiry / scheduled lockdown time; keeps only the earliest; cleared on stop',async()=>{
  const r=rig(),m=mk(r,{opts:{fallbackMs:1e9,reconcileMs:1e9}});await tick();await tick();const b=m.calls;m.h.nudge(61000);m.h.nudge(30000);m.h.nudge(90000);await r.advance(29000);assert.equal(m.calls,b);await r.advance(2000);assert.equal(m.calls,b+1,'fired at the earliest');await r.advance(100000);assert.equal(m.calls,b+1,'later nudges were discarded')
  m.h.nudge(5000);m.h.stop();const c=m.calls;await r.advance(10000);assert.equal(m.calls,c)})
test('nextCheckMs: held slot -> just after 60 s; scheduled lockdown boundary -> just after it; nothing pending -> null',()=>{
  assert.equal(nextCheckMs({slots:[{state:'open'}]}),null);assert.equal(nextCheckMs({slots:[{state:'held'}]}),HOLD_MS+1000)
  const now=Date.UTC(2026,9,15,12);assert.equal(nextCheckMs({nextChange:new Date(now+5000).toISOString(),nowMs:now}),6000);assert.equal(nextCheckMs({slots:[{state:'held'}],nextChange:new Date(now+5000).toISOString(),nowMs:now}),6000)
  assert.equal(nextCheckMs({nextChange:'garbage'}),null);assert.equal(nextCheckMs({nextChange:new Date(now-9999).toISOString(),nowMs:now})>=250,true)})
test('hold expiry scenario: a held slot is re-fetched after the hold can no longer exist, and a student booking never depends on a signal',async()=>{
  const r=rig();let state='held',calls=0;const h=startRealtime({client:r.client,topic:TOPIC_PUBLIC,refresh:async()=>{calls++;h.nudge?.(nextCheckMs({slots:[{state}],nowMs:r.T.now()}))},doc:r.doc,win:r.win,...r.T,fallbackMs:900000,reconcileMs:900000})
  await tick();await tick();r.channels[0].cb('SUBSCRIBED');await tick();await tick();const b=calls;state='open';await r.advance(61500);assert.equal(calls,b+1,'refetched right after 61 s');h.stop()})
test('source guarantees: browser never sends on channels, private only, tables are not subscribed',()=>{const s=fs.readFileSync(new URL('../../src/realtime.js',import.meta.url),'utf8');assert.doesNotMatch(s,/\.send\(|postgres_changes|\.from\(/);assert.match(s,/private: true/);assert.equal(TOPIC_ADMIN,'sched:admin')
  for(const f of ['src/App.jsx','src/Admin.jsx']){const t=fs.readFileSync(new URL('../../'+f,import.meta.url),'utf8');assert.doesNotMatch(t,/onSignal|setBooked|confirmedByEvent/)}})
test('Booking success depends on the RPC response, never on a WebSocket event',()=>{const t=fs.readFileSync(new URL('../../src/App.jsx',import.meta.url),'utf8');const i=t.indexOf("const book = async");const body=t.slice(i,t.indexOf('const drop',i));assert.match(body,/await call\('confirm_booking'/);assert.doesNotMatch(body,/realtime|startRealtime|channel/);assert.ok(body.indexOf("call('confirm_booking'")<body.indexOf('setDone('))})
