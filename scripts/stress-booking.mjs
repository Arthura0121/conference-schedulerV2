import {createClient} from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const slotId = process.env.STRESS_SLOT_ID
const N = Number(process.env.STRESS_CLIENTS || 100)
const CONFIRM = process.env.STRESS_CONFIRM

const fail = msg => { console.error('\nSTRESS TEST STOPPED:', msg); process.exit(1) }
if (!url || !key) fail('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for conference-TEST.')
if (!slotId) fail('Set STRESS_SLOT_ID to ONE future OPEN slot in conference-TEST.')
if (CONFIRM !== 'I_AM_USING_CONFERENCE_TEST') fail('Set STRESS_CONFIRM=I_AM_USING_CONFERENCE_TEST. Never run this against LIVE.')
if (!Number.isInteger(N) || N < 2 || N > 200) fail('STRESS_CLIENTS must be an integer from 2 to 200.')

const mk = () => createClient(url, key, {
  auth: {persistSession:false, autoRefreshToken:false, detectSessionInUrl:false},
  realtime: {params:{eventsPerSecond:2}}
})
const rpc = async (client, fn, args) => {
  const {data,error} = await client.rpc(fn,args)
  if (error) throw error
  return data
}
const code = e => String(e?.message || e || '').trim()

console.log(`Preparing ${N} anonymous student sessions against TEST only…`)
const clients = []
const authFailures = []
for (let i=0;i<N;i+=10) {
  const batch = Array.from({length:Math.min(10,N-i)}, async (_,j) => {
    const c=mk(), n=i+j
    const {error}=await c.auth.signInAnonymously()
    if (error) { authFailures.push({n,error:code(error)}); return }
    clients.push({n,client:c})
  })
  await Promise.all(batch)
  await new Promise(r=>setTimeout(r,100))
}
console.log(`Sessions ready: ${clients.length}/${N}`)
if (authFailures.length) console.log('Auth failures:', authFailures.slice(0,10))
if (clients.length < 2) fail('Fewer than two student sessions were created; cannot test concurrency.')

const before = await rpc(clients[0].client,'list_slots')
const targetBefore = before.find(s=>s.id===slotId)
if (!targetBefore) fail('STRESS_SLOT_ID is not visible to students (past/draft/locked/wrong id).')
if (targetBefore.state !== 'open') fail(`Target slot is ${targetBefore.state}, not open. Pick a disposable OPEN test slot.`)

console.log(`\nRacing ${clients.length} students for the SAME slot…`)
const results = await Promise.all(clients.map(async x => {
  const t=performance.now()
  try {
    const expires=await rpc(x.client,'hold_slot',{p_slot:slotId})
    return {...x,ok:true,expires,ms:Math.round(performance.now()-t)}
  } catch(e) {
    return {...x,ok:false,error:code(e),ms:Math.round(performance.now()-t)}
  }
}))
const winners=results.filter(x=>x.ok), losers=results.filter(x=>!x.ok)
const loserCodes=losers.reduce((m,x)=>(m[x.error]=(m[x.error]||0)+1,m),{})
console.log('Winners:', winners.length)
console.log('Loser results:', loserCodes)
console.log('Latency ms:', {
  min:Math.min(...results.map(x=>x.ms)),
  max:Math.max(...results.map(x=>x.ms)),
  avg:Math.round(results.reduce((n,x)=>n+x.ms,0)/results.length)
})
if (winners.length !== 1) fail(`Expected exactly ONE hold winner; got ${winners.length}.`)
if (losers.some(x=>x.error!=='taken')) fail(`Expected every losing hold to return "taken"; got ${JSON.stringify(loserCodes)}.`)

const during = await rpc(clients[0].client,'list_slots')
const targetDuring = during.find(s=>s.id===slotId)
if (!targetDuring || targetDuring.state !== 'held') fail('After the race, student view did not report the slot as held.')

console.log('Exactly one hold won. Releasing it…')
await rpc(winners[0].client,'release_my_hold')
await new Promise(r=>setTimeout(r,150))

const after = await rpc(clients[0].client,'list_slots')
const targetAfter = after.find(s=>s.id===slotId)
if (!targetAfter || targetAfter.state !== 'open') fail('After release, the slot did not return to open.')

console.log('\nPASS: concurrent hold race serialized correctly.')
console.log('PASS: all losing students were rejected as taken.')
console.log('PASS: held state was visible.')
console.log('PASS: releasing the winning hold reopened the slot.')
console.log(`\nCompleted with ${clients.length} concurrent student sessions; ${N} were requested.`)
console.log('This test does NOT create a booking and does NOT prove production capacity. Run only on conference-TEST.')
