// Public, aggregate-only visitor presence. No names, emails, booking data, or IP addresses are published.
// Realtime Presence groups multiple tabs using the same key into ONE browser visitor.
export const VISITOR_TOPIC = 'sched:visitors'
export const VISITOR_KEY_STORAGE = 'english_conferences_visitor_presence_v1'
export const VISITOR_KEY_LIFETIME_MS = 8 * 60 * 60 * 1000

function randomVisitorId(c) {
 if (typeof c?.randomUUID === 'function') return c.randomUUID().replace(/-/g, '').toLowerCase()
 const bytes = new Uint8Array(16)
 if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes)
 else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
 return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/** An expiring anonymous browser key, shared across same-origin tabs. Not an account ID. */
export function getVisitorKey({storage, cryptoApi, now = Date.now()} = {}) {
 let store = storage
 if (store === undefined) { try { store = globalThis.localStorage } catch { store = null } }
 const c = cryptoApi === undefined ? globalThis.crypto : cryptoApi
 try {
  const old = JSON.parse(store?.getItem(VISITOR_KEY_STORAGE) || 'null')
  if (old && /^[0-9a-f]{32}$/.test(old.id) && Number.isFinite(old.expires) && old.expires > now) return old.id
 } catch { /* storage is optional (for example, in private browsing) */ }
 const id = randomVisitorId(c)
 try { store?.setItem(VISITOR_KEY_STORAGE, JSON.stringify({id, expires: now + VISITOR_KEY_LIFETIME_MS})) } catch {}
 return id
}

/** Count a browser once if any of its tabs is actively viewing. Older clients without
    the active flag cannot prove visibility, so they join the count after a reload. */
export function countVisitors(state) {
 if (!state || typeof state !== 'object') return 0
 return Object.values(state).filter(metas => Array.isArray(metas) && metas.some(meta => meta?.active === true)).length
}

/** One aggregate-only channel across every route. A visible, focused page counts,
    including quiet reading. Hidden tabs and unfocused windows stop tracking. */
export function startVisitorPresence({client, onUpdate = () => {}, storage, cryptoApi, doc = globalThis.document, win = globalThis.window} = {}) {
 if (!client || typeof client.channel !== 'function') throw new Error('A Realtime client is required')
 const key = getVisitorKey({storage, cryptoApi})
 const channel = client.channel(VISITOR_TOPIC, {config: {presence: {key}}})
 let stopped = false, subscribed = false, suspended = false, generation = 0
 let applied = null, busy = false, retry = null
 const active = () => !suspended && doc?.visibilityState === 'visible' &&
  (typeof doc.hasFocus !== 'function' || doc.hasFocus()) && win?.navigator?.onLine !== false
 const update = (status, count = null) => { if (!stopped) onUpdate({status, count}) }
 const sync = () => {
  if (!stopped && subscribed && applied !== null && win?.navigator?.onLine !== false) {
   update('live', countVisitors(channel.presenceState()))
  }
 }
 const clearRetry = () => { if (retry !== null) { win?.clearTimeout?.(retry); retry = null } }
 // Serialize writes: a slow track acknowledgement must never undo a newer blur,
 // hide, or reconnect. Re-read the desired state after every completed write.
 const reconcile = async () => {
  if (stopped || !subscribed || busy || win?.navigator?.onLine === false) return
  const desired = active()
  if (applied === desired) { sync(); return }
  clearRetry()
  const attempt = generation
  busy = true
  let failed = false
  try {
   const result = await (desired ? channel.track({online: true, active: true}) : channel.untrack())
   if (stopped || attempt !== generation) return
   if (result !== 'ok') throw new Error('Presence update failed')
   applied = desired
   sync()
  } catch {
   if (!stopped && attempt === generation) {
    applied = null
    failed = true
    update('unavailable')
    retry = win?.setTimeout?.(() => { retry = null; void reconcile() }, 5000) ?? null
   }
  } finally {
   busy = false
   if (!stopped && subscribed && !failed && (attempt !== generation || applied !== active())) void reconcile()
  }
 }
 const refresh = () => { void reconcile() }
 const offline = () => { ++generation; applied = null; clearRetry(); update('unavailable') }
 const online = () => { update('connecting'); refresh() }
 const hide = () => { suspended = true; refresh() }
 const show = () => { suspended = false; refresh() }
 const listeners = [
  [doc, 'visibilitychange', refresh], [win, 'focus', refresh], [win, 'blur', refresh],
  [win, 'pagehide', hide], [win, 'pageshow', show],
  [doc, 'freeze', hide], [doc, 'resume', show],
  [win, 'offline', offline], [win, 'online', online]
 ]
 for (const [target, event, listener] of listeners) target?.addEventListener?.(event, listener)
 channel.on('presence', {event: 'sync'}, sync)
 channel.subscribe(status => {
  if (stopped) return
  if (status === 'SUBSCRIBED') {
   ++generation
   subscribed = true
   applied = null
   update('connecting')
   refresh()
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
   ++generation
   subscribed = false
   applied = null
   clearRetry()
   update('unavailable')
  }
 })
 if (win?.navigator?.onLine === false) update('unavailable')
 return {
  stop() {
   if (stopped) return
   stopped = true
   ++generation
   clearRetry()
   for (const [target, event, listener] of listeners) target?.removeEventListener?.(event, listener)
   // Remove only our channel; scheduling Broadcast channels belong to the app.
   try { void Promise.resolve(channel.untrack()).catch(() => {}) } catch {}
   try { void Promise.resolve(client.removeChannel(channel)).catch(() => {}) } catch {}
  }
 }
}
