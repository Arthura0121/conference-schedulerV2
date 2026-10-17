// v2.4.3 unit tests: floating-toolbar clearance, hidden-selection notice, stale-preview note, frozen dialog list, and bulk eligibility for FUTURE fixtures.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {keyboardInset, KEYBOARD_MIN_PX, hiddenSelected, staleNote, scopeText, classifyForBulk} from '../../src/bulk.js'

const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8')

test('keyboardInset: browser-chrome changes are not keyboards, real keyboards are', () => {
  assert.equal(keyboardInset(800, 800, 0), 0)
  assert.equal(keyboardInset(800, 740, 0), 0, 'a 60px URL-bar change is not a keyboard')
  assert.equal(keyboardInset(800, 800 - KEYBOARD_MIN_PX + 1, 0), 0)
  assert.equal(keyboardInset(800, 500, 0), 300)
  assert.equal(keyboardInset(800, 500, 20), 280, 'accounts for visual viewport offsetTop')
  assert.equal(keyboardInset(800, 900, 0), 0, 'never negative')
})

test('hiddenSelected counts only selected rows that the filters hide', () => {
  const a = {id: 'a'}, b = {id: 'b'}, c = {id: 'c'}
  assert.equal(hiddenSelected([a, b], [a, b, c]), 0)
  assert.equal(hiddenSelected([a, b], [a, c]), 1)
  assert.equal(hiddenSelected([], [a]), 0)
  assert.equal(hiddenSelected([a, b], []), 2)
})

test('scopeText names hidden selected rows, and stays unchanged when none are hidden', () => {
  assert.equal(scopeText({mode: 'selected', count: 3}), '3 selected appointments')
  assert.equal(scopeText({mode: 'selected', count: 1}), '1 selected appointment')
  assert.match(scopeText({mode: 'selected', count: 3, hidden: 1}), /1 of them hidden by the current filters/)
})

test('staleNote is empty when the server did what the preview said, and explains otherwise', () => {
  assert.equal(staleNote(5, 5), '')
  assert.equal(staleNote(NaN, 5), '', 'no preview number means no comparison')
  assert.match(staleNote(5, 3), /preview said 5.*changed in the meantime/)
})

// Future fixtures at a fixed "now": the 99 historic paper rows in TEST never proved this.
const NOW = Date.parse('2026-10-17T12:00:00Z')
const fut = o => ({id: 'x', start_at: '2026-11-03T14:00:00Z', draft: false, available: true, reason: null, booked: false, ...o})
const run = (slot, avail, other = false) => classifyForBulk(slot, avail, other, NOW)
test('FUTURE paper-reserved slot is never reopened, with or without the opt-in, and never rewritten by a close', () => {
  const paper = fut({available: false, reason: 'Taken on paper sign-up sheet'})
  for (const other of [false, true]) { assert.equal(run(paper, true, other), 'paper'); assert.equal(run(paper, false, other), 'paper') }
  assert.equal(run({...paper, reason: 'taken on PAPER'}, true, true), 'paper', 'case-insensitive, like the SQL ilike')
})
test('FUTURE booked slot is protected from open and close', () => {
  const booked = fut({booked: true})
  assert.equal(run(booked, false), 'booked'); assert.equal(run(booked, true), 'booked')
})
test('draft and past slots are protected; ordinary future slots are eligible', () => {
  assert.equal(run(fut({draft: true}), false), 'draft')
  assert.equal(run(fut({start_at: '2026-10-01T14:00:00Z'}), false), 'past')
  assert.equal(run(fut({}), false), 'eligible')
  assert.equal(run(fut({available: false, reason: 'Closed by teacher'}), true), 'eligible')
  assert.equal(run(fut({available: false, reason: 'Not available'}), true), 'needs_opt_in')
  assert.equal(run(fut({available: false, reason: 'Not available'}), true, true), 'eligible')
})

test('BulkDialog freezes its list when it opens (preview and action use the same ids)', () => {
  const s = read('src/teacher/BulkDialog.jsx')
  assert.match(s, /const \[snap\] = useState\(\(\) => \(\{ids: \[\.\.\.liveIds\]/)
  assert.ok(!/\bids\b\s*=\s*liveIds/.test(s))
})

test('BulkBar: measured sizes, variables set before the class, full cleanup, no fixed 150px guess', () => {
  const b = read('src/teacher/BulkBar.jsx'), css = read('src/styles/teacher.css')
  assert.match(b, /ResizeObserver/); assert.match(b, /visualViewport/)
  assert.ok(b.indexOf('apply()') < b.indexOf("classList.add('bulk-active')"), 'variables must be set before the class (otherwise the scroll position jumps)')
  assert.match(b, /classList\.remove\('bulk-active'\)/); assert.match(b, /removeProperty/); assert.match(b, /ro\?\.disconnect\(\)/)
  assert.ok(!/calc\(150px/.test(css), 'the v2.4.2 magic number must stay gone')
  assert.match(css, /body\.bulk-active \.tapp:not\(\.wide\) \.tmain\{padding-bottom:[^}]*var\(--bulkbar-h/)
  assert.match(css, /body\.bulk-active \.tapp\.wide \.tmain\{padding-bottom:[^}]*var\(--bulkbar-h/)
})
