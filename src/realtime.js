// Live sync controller (framework-free, unit-tested with a fake client in tests/unit/realtime.test.js).
// Architecture: the DATABASE sends tiny {v:1,kind} signals on PRIVATE Broadcast topics (see migration 003). A signal only means "something changed, refetch":
// the controller then calls refresh(), which uses the normal function-only RPCs. Signals carry no data, never decide a booking, and cannot be forged by browsers.
export const TOPIC_PUBLIC = 'sched:public', TOPIC_ADMIN = 'sched:admin', EVENT = 'sync'
export const KINDS = ['slots', 'holds', 'bookings', 'settings', 'activity']
export const STATUS = {connecting: 'connecting', syncing: 'syncing', live: 'live', reconnecting: 'reconnecting', offline: 'offline'}
export const STATUS_LABEL = {connecting: 'Connecting', syncing: 'Syncing', live: 'Live', reconnecting: 'Reconnecting', offline: 'Offline'}
export const HOLD_MS = 60000
const MAX_TIMER = 2147483000

/** A message is acted on only if it has the expected shape. (Authorization itself is enforced by the database; this only ignores junk.) */
export const isSignal = p => Boolean(p) && typeof p === 'object' && p.v === 1 && KINDS.includes(p.kind)

/** Milliseconds until the next time-based change we should re-check: a visible hold expiring, or a scheduled lockdown/editing-lock boundary. null = nothing pending. */
export function nextCheckMs({slots = [], nextChange = null, nowMs = Date.now(), pad = 1000} = {}) {
  const c = []
  if (slots.some(s => s.state === 'held')) c.push(HOLD_MS + pad)   // a hold seen now ends within 60 s; check just after the longest possible remaining time
  if (nextChange) { const t = new Date(nextChange).getTime(); if (Number.isFinite(t)) c.push(Math.max(250, t - nowMs + pad)) }
  return c.length ? Math.min(...c) : null
}

export function startRealtime({client, topic, refresh, prepare, onStatus = () => {}, debounceMs = 150, fallbackMs = 15000, reconcileMs = 60000,
  doc = globalThis.document, win = globalThis.window, now = () => Date.now(), setT = (f, ms) => setTimeout(f, ms), clearT = id => clearTimeout(id),
  setI = (f, ms) => setInterval(f, ms), clearI = id => clearInterval(id)}) {
  let stopped = false, needSync = false, status = '', ch = null, gen = 0, inflight = false, again = false, debounce = null, nudgeT = null, nudgeAt = Infinity, lastOk = 0, everLive = false
  const set = s => { if (stopped || s === status) return; status = s; onStatus(s) }
  const visible = () => !doc || doc.visibilityState !== 'hidden'
  const online = () => !win || win.navigator?.onLine !== false

  /** One refresh at a time. Requests arriving meanwhile collapse into ONE follow-up run (coalescing). Returns true if the data was fetched. */
  async function run() {
    if (stopped) return false
    if (inflight) { again = true; return false }
    const forSub = needSync; needSync = false      // only a fetch that STARTED after (re)subscription proves we are in sync
    inflight = true; let ok = false
    try { await refresh(); ok = true; lastOk = now() } catch { ok = false }
    inflight = false
    if (stopped) return ok
    if (!ok && forSub) needSync = true
    if (ok && forSub && status === STATUS.syncing) { set(STATUS.live); everLive = true }
    if (again) { again = false; schedule(0) }
    return ok
  }
  function schedule(ms = debounceMs) { if (stopped) return; if (debounce) clearT(debounce); debounce = setT(() => { debounce = null; run() }, ms) }

  function onMsg(m) {
    const p = m && (m.payload ?? m)
    if (!isSignal(p)) return
    schedule()
  }
  async function connect() {
    const my = ++gen
    set(online() ? (everLive ? STATUS.reconnecting : STATUS.connecting) : STATUS.offline)
    try { if (prepare) await prepare(); await client.realtime?.setAuth?.() } catch { if (my === gen && !stopped) set(online() ? STATUS.reconnecting : STATUS.offline); return }
    if (stopped || my !== gen) return                                   // stopped (or superseded) while awaiting: never create a second listener
    ch = client.channel(topic, {config: {private: true, broadcast: {self: false}}})
    ch.on('broadcast', {event: EVENT}, onMsg)
    ch.subscribe((s, err) => {
      if (stopped || my !== gen) return
      if (s === 'SUBSCRIBED') { set(STATUS.syncing); needSync = true; run() }        // refetch AFTER every (re)subscription: anything missed while disconnected is recovered here
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') set(online() ? STATUS.reconnecting : STATUS.offline)
    })
  }

  // time-based reconcile: fast fallback polling whenever we are NOT live; slow safety check while live
  const tick = () => { if (stopped || !visible() || !online()) return; if (status === STATUS.live && now() - lastOk < reconcileMs) return; run() }
  const iv = setI(tick, fallbackMs)
  const wake = () => { if (stopped) return; if (!online()) return set(STATUS.offline); if (status === STATUS.offline) set(STATUS.reconnecting); if (visible()) run() }
  const goOffline = () => set(STATUS.offline)
  const evs = [[doc, 'visibilitychange', wake], [win, 'focus', wake], [win, 'online', wake], [win, 'offline', goOffline]].filter(([t]) => t && t.addEventListener)
  evs.forEach(([t, e, f]) => t.addEventListener(e, f))
  if (!online()) set(STATUS.offline)
  connect(); run()    // the initial fetch never waits for the socket

  return {
    stop() { stopped = true; gen++; clearI(iv); if (debounce) clearT(debounce); if (nudgeT) clearT(nudgeT); evs.forEach(([t, e, f]) => t.removeEventListener(e, f)); try { ch && client.removeChannel(ch) } catch {} ch = null },
    refreshNow: () => run(),
    /** Re-check in `ms` (hold expiry, scheduled lockdown). Keeps only the earliest pending check. */
    nudge(ms) { if (stopped || ms == null) return; const at = now() + Math.min(ms, MAX_TIMER); if (nudgeT && at >= nudgeAt) return; if (nudgeT) clearT(nudgeT); nudgeAt = at; nudgeT = setT(() => { nudgeT = null; nudgeAt = Infinity; run() }, Math.min(ms, MAX_TIMER)) },
    status: () => status
  }
}
