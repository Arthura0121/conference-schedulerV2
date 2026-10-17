// Small, dependency-free refresh helpers (unit-tested in tests/unit/poll.test.js).
export const ADMIN_POLL_MS=5000,STUDENT_POLL_MS=15000
/** Ignore responses that arrive after a newer request started (out-of-order replies). */
export function makeLatest(){let n=0;return{next:()=>++n,isLatest:id=>id===n}}
/**
 * Calls refresh() every intervalMs while the page is visible, plus once when the tab becomes visible / focused / back online.
 * - never runs two refreshes at once (but recovers if one hangs longer than stuckMs)
 * - a failing refresh never stops polling
 * - returns stop(): clears the timer and removes EVERY listener it added (no accumulation when React re-runs the effect)
 */
export function startPolling({refresh,intervalMs,immediate=true,stuckMs=Math.max(intervalMs*3,15000),
  doc=globalThis.document,win=globalThis.window,setIntervalFn=(...a)=>setInterval(...a),clearIntervalFn=(...a)=>clearInterval(...a),now=()=>Date.now()}){
  let busy=false,startedAt=0,stopped=false
  const visible=()=>!doc||doc.visibilityState!=='hidden'
  const run=async()=>{if(stopped)return;if(busy&&now()-startedAt<stuckMs)return;busy=true;startedAt=now();try{await refresh()}catch{}finally{busy=false}}
  const wake=()=>{if(visible())run()}
  const id=setIntervalFn(wake,intervalMs)
  const evs=[[doc,'visibilitychange'],[win,'focus'],[win,'online']].filter(([t])=>t&&t.addEventListener)
  evs.forEach(([t,e])=>t.addEventListener(e,wake))
  if(immediate)run()
  return()=>{stopped=true;clearIntervalFn(id);evs.forEach(([t,e])=>t.removeEventListener(e,wake))}
}
