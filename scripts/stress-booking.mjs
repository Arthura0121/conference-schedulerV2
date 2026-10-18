import {createClient} from '@supabase/supabase-js'
import fs from 'node:fs'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
const slotId = process.env.STRESS_SLOT_ID
const N = Number(process.env.STRESS_CLIENTS || 100)
const CONFIRM = process.env.STRESS_CONFIRM
const AUTH_DELAY_MS = Number(process.env.STRESS_AUTH_DELAY_MS || 750)
const CACHE = '.stress-sessions.json'

const fail = msg => { console.error('\nSTRESS TEST STOPPED:', msg); process.exit(1) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
if (!url || !key) fail('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for conference-TEST.')
if (!slotId) fail('Set STRESS_SLOT_ID to ONE future OPEN slot in conference-TEST.')
if (CONFIRM !== 'I_AM_USING_CONFERENCE_TEST') fail('Set STRESS_CONFIRM=I_AM_USING_CONFERENCE_TEST. Never run this against LIVE.')
if (!Number.isInteger(N) || N < 2 || N > 200) fail('STRESS_CLIENTS must be an integer from 2 to 200.')
if (!Number.isFinite(AUTH_DELAY_MS) || AUTH_DELAY_MS < 0 || AUTH_DELAY_MS > 10000) fail('STRESS_AUTH_DELAY_MS must be from 0 to 10000.')

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
const compact = s => s && s.access_token && s.refresh_token ? ({
  access_token:s.access_token,
  refresh_token:s.refresh_token,
  expires_at:s.expires_at || null,
  user_id:s.user?.id || null
}) : null

function readCache() {
  try {
    const x=JSON.parse(fs.readFileSync(CACHE,'utf8'))
    if (x.url !== url || !Array.isArray(x.sessions)) return []
    return x.sessions.filter(x => x?.access_token && x?.refresh_token)
  } catch { return [] }
}
function writeCache(sessions) {
  const unique=[...new Map(sessions.filter(Boolean).map(s=>[(s.user_id || s.refresh_token),s])).values()]
  fs.writeFileSync(CACHE,JSON.stringify({url,sessions:unique},null,2),{mode:0o600})
  try { fs.chmodSync(CACHE,0o600) } catch {}
}

console.log(`Preparing up to ${N} distinct student sessions against TEST only…`)
const saved=readCache()
const clients=[]
const cacheOut=[]
let stale=0

for (const savedSession of saved.slice(0,N)) {
  const c=mk()
  const {data,error}=await c.auth.setSession({access_token:savedSession.access_token,refresh_token:savedSession.refresh_token})
  const session=compact(data?.session)
  if (error || !session) { stale++; continue }
  clients.push({n:clients.length,client:c})
  cacheOut.push(session)
}
if (saved.length) console.log(`Reused cached sessions: ${clients.length}${stale ? ` (${stale} stale/invalid skipped)` : ''}`)

let rateLimited=false
const authFailures=[]
while (clients.length < N) {
  const c=mk(), n=clients.length
  const {data,error}=await c.auth.signInAnonymously()
  if (error) {
    const msg=code(error)
    authFailures.push({n,error:msg})
    if (/rate limit/i.test(msg)) { rateLimited=true; break }
    if (authFailures.length >= 10) break
  } else {
    const session=compact(data?.session)
    if (session) {
      clients.push({n,client:c})
      cacheOut.push(session)
      if (clients.length % 10 === 0 || clients.length === N) console.log(`Session pool: ${clients.length}/${N}`)
    }
  }
  if (clients.length < N && AUTH_DELAY_MS) await sleep(AUTH_DELAY_MS)
}
writeCache(cacheOut)

console.log(`Sessions ready: ${clients.length}/${N}`)
console.log(`Saved reusable TEST session pool to ${CACHE} (git-ignored).`)
if (authFailures.length) console.log('Auth failures:', authFailures.slice(0,10))
if (rateLimited && clients.length < N) console.log(`Supabase stopped new signups at ${clients.length}/${N}. Re-run this command after the auth limit resets; the saved sessions will be reused and the pool can grow.`)
if (clients.length < 2) fail('Fewer than two student sessions are available; cannot test concurrency.')

const before = await rpc(clients[0].client,'list_slots')
const targetBefore = before.find(s=>s.id===slotId)
if (!targetBefore) fail('STRESS_SLOT_ID is not visible to students (past/draft/locked/wrong id).')
if (targetBefore.state !== 'open') fail(`Target slot is ${targetBefore.state}, not open. Pick a disposable OPEN test slot.`)

console.log(`\nRacing ${clients.length} DISTINCT students for the SAME slot…`)
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
await sleep(150)

const after = await rpc(clients[0].client,'list_slots')
const targetAfter = after.find(s=>s.id===slotId)
if (!targetAfter || targetAfter.state !== 'open') fail('After release, the slot did not return to open.')

console.log('\nPASS: concurrent hold race serialized correctly.')
console.log('PASS: all losing students were rejected as taken.')
console.log('PASS: held state was visible.')
console.log('PASS: releasing the winning hold reopened the slot.')
if (clients.length === N) console.log(`PASS: full requested race completed with ${N} distinct student sessions.`)
else console.log(`PARTIAL CAPACITY RUN: booking race passed with ${clients.length} distinct sessions; requested ${N}. Re-run later to grow the cached pool.`)
console.log('\nThis test does NOT create a booking and does NOT prove production capacity. Run only on conference-TEST.')
