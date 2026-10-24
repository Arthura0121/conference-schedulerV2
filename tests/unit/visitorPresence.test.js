import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {countVisitors, getVisitorKey, startVisitorPresence, VISITOR_TOPIC, VISITOR_KEY_STORAGE, VISITOR_KEY_LIFETIME_MS} from '../../src/visitorPresence.js'

const turn = () => new Promise(resolve => setImmediate(resolve))

test('presence counts connected browser KEYS, not extra tabs or empty metas', () => {
 assert.equal(countVisitors(null), 0)
 assert.equal(countVisitors({}), 0)
 assert.equal(countVisitors({browserA: [{}, {}], browserB: [{}], disappeared: []}), 2)
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

test('one public Presence channel tracks and re-syncs counts, degrades honestly and cleans up', async () => {
 const events = [], updates = [], removed = []
 const state = {one: [{}, {}], two: [{}]}
 let statusCallback, syncCallback
 const channel = {
  on(type, filter, handler) { assert.equal(type, 'presence'); assert.deepEqual(filter, {event:'sync'}); syncCallback = handler; return this },
  subscribe(callback) { statusCallback = callback; return this },
  track: async payload => { assert.deepEqual(payload, {online:true}); return 'ok' },
  presenceState: () => state,
  untrack: () => { events.push('untrack') }
 }
 const client = {
  channel(topic, options) { assert.equal(topic, VISITOR_TOPIC); assert.match(options.config.presence.key, /^[0-9a-f]{32}$/); return channel },
  removeChannel(ch) { removed.push(ch) }
 }
 const h = startVisitorPresence({client, onUpdate: x => updates.push(x), storage: {getItem:()=>null,setItem:()=>{}}, cryptoApi:{randomUUID:()=> '11111111-1111-1111-1111-111111111111'}})
 statusCallback('SUBSCRIBED')
 await turn()
 assert.deepEqual(updates.at(-1), {status:'live',count:2})
 state.three = [{}]
 syncCallback()
 assert.deepEqual(updates.at(-1), {status:'live',count:3})
 statusCallback('TIMED_OUT')
 assert.deepEqual(updates.at(-1), {status:'unavailable',count:null})
 statusCallback('SUBSCRIBED')
 await turn()
 assert.deepEqual(updates.at(-1), {status:'live',count:3})
 const beforeStop = updates.length
 h.stop(); h.stop()
 assert.deepEqual(removed, [channel])
 assert.deepEqual(events, ['untrack'])
 syncCallback()
 statusCallback('SUBSCRIBED')
 await turn()
 assert.equal(updates.length, beforeStop, 'late events cannot update the screen after cleanup')
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
