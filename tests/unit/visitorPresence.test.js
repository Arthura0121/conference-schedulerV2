import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {countVisitors, getVisitorKey, startVisitorPresence, VISITOR_TOPIC, VISITOR_KEY_STORAGE, VISITOR_KEY_LIFETIME_MS} from '../../src/visitorPresence.js'

const turn = () => new Promise(resolve => setImmediate(resolve))

test('presence counts only active browsers, deduplicating tabs and excluding legacy payloads', () => {
 assert.equal(countVisitors(null), 0)
 assert.equal(countVisitors({}), 0)
 assert.equal(countVisitors({browserA: [{active:true}, {active:true}], browserB: [{active:false}, {active:true}], hidden: [{active:false}], legacy: [{online:true}], malformed: [null], disappeared: []}), 2)
})

test('anonymous browser key survives tabs and expires; no account or identity stored', () => {
 const data = new Map()
 const storage = {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)}
 let num = 0
 const cryptoApi = {randomUUID: () => (++num === 1 ? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' : 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')}
 const first = getVisitorKey({storage, cryptoApi, now: 1000})
 assert.equal(first, 'a'.repeat(32))
 assert.equal(getVisitorKey({storage, cryptoApi, now: 2000}), first)
 assert.equal(num, 1, 'second tab shares the visitor key')
 assert.deepEqual(Object.keys(JSON.parse(data.get(VISITOR_KEY_STORAGE))).sort(), ['expires', 'id'])
 assert.equal(getVisitorKey({storage, cryptoApi, now: 1000 + VISITOR_KEY_LIFETIME_MS + 1}), 'b'.repeat(32))
})

function fixture({visible = true, focused = true, track, untrack} = {}) {
 const doc = new EventTarget(), win = new EventTarget(), calls = [], updates = [], removed = []
 doc.visibilityState = visible ? 'visible' : 'hidden'
 doc.hasFocus = () => focused
 win.navigator = {onLine:true}
 const timers = new Map()
 let timerId = 0, statusCallback, syncCallback
 win.setTimeout = fn => { timers.set(++timerId, fn); return timerId }
 win.clearTimeout = id => timers.delete(id)
 const state = {other:[{active:true}]}
 const channel = {
  on(type, filter, handler) { assert.equal(type, 'presence'); syncCallback = handler; return this },
  subscribe(callback) { statusCallback = callback; return this },
  async track(payload) {
   calls.push('track'); assert.deepEqual(payload,{online:true,active:true})
   const result = track ? await track() : 'ok'
   if(result === 'ok') state.self = [payload]
   return result
  },
  async untrack() {
   calls.push('untrack')
   const result = untrack ? await untrack() : 'ok'
   if(result === 'ok') delete state.self
   return result
  },
  presenceState: () => state
 }
 const client = {
  channel(topic, options) { assert.equal(topic,VISITOR_TOPIC); assert.match(options.config.presence.key,/^[0-9a-f]{32}$/); return channel },
  removeChannel(ch) { removed.push(ch); return Promise.resolve('ok') }
 }
 const controller = startVisitorPresence({client,doc,win,onUpdate:x=>updates.push(x),storage:null})
 return {doc,win,calls,updates,removed,state,timers,controller,
  status: value => statusCallback(value), sync: () => syncCallback(),
  visibility(value) { doc.visibilityState = value; doc.dispatchEvent(new Event('visibilitychange')) },
  focus(value) { focused = value; win.dispatchEvent(new Event(value?'focus':'blur')) },
  event(name) { win.dispatchEvent(new Event(name)) }
 }
}

test('visible focused reader tracks, hides/blur untrack, returning resumes without duplicate writes', async () => {
 const h=fixture()
 h.status('SUBSCRIBED'); await turn()
 assert.deepEqual(h.updates.at(-1),{status:'live',count:2})
 h.focus(false); await turn()
 assert.deepEqual(h.calls,['track','untrack'])
 assert.deepEqual(h.updates.at(-1),{status:'live',count:1})
 h.visibility('hidden'); h.focus(true); await turn()
 assert.equal(h.calls.length,2,'focus alone cannot count a hidden page')
 h.visibility('visible'); await turn()
 h.event('pageshow'); h.sync(); await turn()
 assert.deepEqual(h.calls,['track','untrack','track'])
 h.event('pagehide'); await turn()
 assert.equal(h.calls.at(-1),'untrack')
 h.event('pageshow'); await turn()
 assert.equal(h.calls.at(-1),'track')
 h.controller.stop()
})

test('background loads and background reconnects never track; zero is a valid count', async () => {
 const h=fixture({visible:false})
 delete h.state.other
 h.status('SUBSCRIBED'); await turn()
 assert.deepEqual(h.calls,['untrack'])
 assert.deepEqual(h.updates.at(-1),{status:'live',count:0})
 h.status('TIMED_OUT')
 assert.deepEqual(h.updates.at(-1),{status:'unavailable',count:null})
 h.status('SUBSCRIBED'); await turn()
 assert.equal(h.calls.includes('track'),false)
 h.visibility('visible'); await turn()
 assert.deepEqual(h.updates.at(-1),{status:'live',count:1})
 h.controller.stop()
})

test('slow track followed by hiding is reconciled to untracked, and rapid toggles settle correctly', async () => {
 let finish
 const h=fixture({track:()=>new Promise(resolve=>{finish=resolve})})
 h.status('SUBSCRIBED')
 h.visibility('hidden')
 finish('ok'); await turn()
 assert.deepEqual(h.calls,['track','untrack'])
 assert.equal(h.state.self,undefined)
 h.visibility('visible'); h.focus(false); h.focus(true); h.visibility('hidden')
 finish('ok'); await turn()
 assert.equal(h.calls.at(-1),'untrack')
 h.controller.stop()
})

test('a reconnect supersedes an in-flight track without restoring hidden presence', async () => {
 let finish
 const h=fixture({track:()=>new Promise(resolve=>{finish=resolve})})
 h.status('SUBSCRIBED'); h.status('CHANNEL_ERROR'); h.visibility('hidden'); h.status('SUBSCRIBED')
 finish('ok'); await turn()
 assert.deepEqual(h.calls,['track','untrack'])
 assert.deepEqual(h.updates.at(-1),{status:'live',count:1})
 h.controller.stop()
})

test('offline and failed writes show unavailable, retry latest visibility, and cleanup is final', async () => {
 let fail=true
 const h=fixture({track:async()=>fail?'timed out':'ok'})
 h.status('SUBSCRIBED'); await turn()
 assert.deepEqual(h.updates.at(-1),{status:'unavailable',count:null})
 assert.equal(h.timers.size,1)
 const retry=[...h.timers.values()][0]; h.timers.clear()
 fail=false; retry(); await turn()
 assert.deepEqual(h.updates.at(-1),{status:'live',count:2})
 h.win.navigator.onLine=false; h.event('offline'); h.sync()
 assert.deepEqual(h.updates.at(-1),{status:'unavailable',count:null})
 h.visibility('hidden'); h.win.navigator.onLine=true; h.event('online'); await turn()
 assert.equal(h.calls.at(-1),'untrack')
 h.controller.stop(); h.controller.stop(); await turn()
 const count=h.updates.length, calls=h.calls.length
 h.visibility('visible'); h.focus(true); h.event('pageshow'); h.event('online'); h.status('SUBSCRIBED'); h.sync(); await turn()
 assert.equal(h.updates.length,count)
 assert.equal(h.calls.length,calls)
 assert.equal(h.removed.length,1)
 assert.equal(h.timers.size,0)
})

test('the counter is outside route branches and has distinct styles for every theme and mobile nav', () => {
 const main = fs.readFileSync(new URL('../../src/main.jsx', import.meta.url), 'utf8')
 const widget = fs.readFileSync(new URL('../../src/components/VisitorCounter.jsx', import.meta.url), 'utf8')
 const css = fs.readFileSync(new URL('../../src/styles/visitor-count.css', import.meta.url), 'utf8')
 assert.match(main, /<App \/><VisitorCounter \/>/)
 assert.match(widget, /startVisitorPresence/)
 assert.match(widget, /configured/)
 assert.match(css, /body:has\(\.bnav\) \.visitor-counter/)
 assert.match(css, /body:has\(\.ad-cosmos\) \.visitor-counter/)
 for (const theme of ['fall','halloween','winter']) assert.ok(css.includes(':root[data-theme="' + theme + '"] .visitor-counter'),theme)
 assert.match(css, /\.visitor-counter\{/)
})
