import test from 'node:test';import assert from 'node:assert/strict'
import {startPolling,makeLatest} from '../../src/poll.js'
// ---- fakes: manual clock/timers and a document/window that count listeners ----
function env(){let t=0,nextId=1;const timers=new Map(),L={doc:{},win:{}}
  const mk=(bag)=>({addEventListener:(e,f)=>{(bag[e]??=new Set()).add(f)},removeEventListener:(e,f)=>bag[e]?.delete(f)})
  const doc={visibilityState:'visible',...mk(L.doc)},win=mk(L.win)
  return{doc,win,now:()=>t,async advance(ms,step=1000){const end=t+ms;while(t<end){t=Math.min(t+step,end);for(const [,x] of timers)if(t>=x.next){x.next+=x.every;x.fn()};await new Promise(r=>setImmediate(r))}},  // lets promises settle between ticks, like real time
   setIntervalFn:(fn,every)=>{const id=nextId++;timers.set(id,{fn,every,next:t+every});return id},clearIntervalFn:id=>timers.delete(id),
   fire:(who,ev)=>[...(L[who][ev]||[])].forEach(f=>f()),timers:()=>timers.size,listeners:()=>Object.values(L.doc).concat(Object.values(L.win)).reduce((n,s)=>n+s.size,0)}}
const start=(e,refresh,o={})=>startPolling({refresh,intervalMs:5000,doc:e.doc,win:e.win,setIntervalFn:e.setIntervalFn,clearIntervalFn:e.clearIntervalFn,now:e.now,...o})
const flush=()=>new Promise(r=>setImmediate(r))
test('refreshes immediately, then every interval',async()=>{const e=env();let n=0;const stop=start(e,()=>{n++});await flush();assert.equal(n,1);await e.advance(5000);await flush();assert.equal(n,2);await e.advance(10000);await flush();assert.equal(n,4);stop()})
test('does not poll while the page is hidden; refreshes when it becomes visible',async()=>{const e=env();let n=0;const stop=start(e,()=>{n++},{immediate:false});e.doc.visibilityState='hidden';await e.advance(20000);await flush();assert.equal(n,0);e.doc.visibilityState='visible';e.fire('doc','visibilitychange');await flush();assert.equal(n,1);stop()})
test('refreshes on window focus and when the network comes back',async()=>{const e=env();let n=0;const stop=start(e,()=>{n++},{immediate:false});e.fire('win','focus');await flush();e.fire('win','online');await flush();assert.equal(n,2);stop()})
test('never runs two refreshes at once',async()=>{const e=env();let calls=0,release;const stop=start(e,()=>{calls++;return new Promise(r=>{release=r})});await flush();await e.advance(10000);await flush();assert.equal(calls,1,'ticks during an in-flight refresh are skipped');release();await flush();await e.advance(5000);await flush();assert.equal(calls,2);stop()})
test('recovers if one refresh hangs forever (no network timeout)',async()=>{const e=env();let calls=0;const stop=start(e,()=>{calls++;return new Promise(()=>{})},{stuckMs:20000});await flush();await e.advance(15000);await flush();assert.equal(calls,1);await e.advance(10000);await flush();assert.ok(calls>=2,'a new refresh must start after stuckMs');stop()})
test('a failing refresh never stops polling',async()=>{const e=env();let n=0;const stop=start(e,()=>{n++;throw new Error('network down')});await flush();await e.advance(10000);await flush();assert.equal(n,3);stop()})
test('stop() clears the timer and removes every listener; after stop nothing runs',async()=>{const e=env();let n=0;const stop=start(e,()=>{n++});assert.equal(e.timers(),1);assert.equal(e.listeners(),3);stop();assert.equal(e.timers(),0);assert.equal(e.listeners(),0);const before=n;await e.advance(30000);e.fire('win','focus');await flush();assert.equal(n,before)})
test('React-style effect re-runs (start/stop x50) leave no timers or listeners behind',()=>{const e=env();for(let i=0;i<50;i++){const s=start(e,()=>{},{immediate:false});s()};assert.equal(e.timers(),0);assert.equal(e.listeners(),0)})
test('stale responses are ignored (makeLatest)',()=>{const l=makeLatest(),a=l.next(),b=l.next();assert.equal(l.isLatest(a),false);assert.equal(l.isLatest(b),true)})
