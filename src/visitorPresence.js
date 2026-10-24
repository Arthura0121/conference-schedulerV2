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

/** Presence state is keyed by browser ID. Multiple metas under a key mean multiple tabs, not people. */
export function countVisitors(state) {
 if (!state || typeof state !== 'object') return 0
 return Object.values(state).filter(metas => Array.isArray(metas) && metas.length > 0).length
}

/** One Presence channel for the whole app, across teacher/student/login/lock/loading routes.
    Supabase owns disconnect cleanup and automatically rejoins after a dropped socket. */
export function startVisitorPresence({client, onUpdate = () => {}, storage, cryptoApi, doc = globalThis.document, win = globalThis.window} = {}) {
 if (!client || typeof client.channel !== 'function') throw new Error('A Realtime client is required')
 const key = getVisitorKey({storage, cryptoApi})
 const channel = client.channel(VISITOR_TOPIC, {config: {presence: {key}}})
 let stopped = false, generation = 0, tracked = false
 const update = (status, count = null) => { if (!stopped) onUpdate({status, count}) }
 const sync = () => {
  if (!stopped && tracked && win?.navigator?.onLine !== false) {
   update('live', Math.max(1, countVisitors(channel.presenceState())))
  }
 }
 channel.on('presence', {event: 'sync'}, sync)
 channel.subscribe(status => {
  if (stopped) return
  if (status === 'SUBSCRIBED') {
   const attempt = ++generation
   tracked = false
   update('connecting')
   Promise.resolve().then(() => channel.track({online: true})).then(result => {
    if (stopped || attempt !== generation) return
    if (result !== 'ok') { update('unavailable'); return }
    tracked = true
    sync()
   }).catch(() => { if (!stopped && attempt === generation) update('unavailable') })
  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
   ++generation
   tracked = false
   update('unavailable')
  }
 })
 const offline = () => update('unavailable')
 const online = () => update('connecting')
 win?.addEventListener?.('offline', offline)
 win?.addEventListener?.('online', online)
 if (win?.navigator?.onLine === false) update('unavailable')
 return {
  stop() {
   if (stopped) return
   stopped = true
   ++generation
   win?.removeEventListener?.('offline', offline)
   win?.removeEventListener?.('online', online)
   // Do not touch the app's separate, private scheduling Broadcast channels.
   try { void channel.untrack?.() } catch {}
   try { void client.removeChannel(channel) } catch {}
  }
 }
}
