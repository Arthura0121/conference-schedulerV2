import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {toDatetimeLocal,toIsoOrNull,lockScheduleError} from '../../src/teacher/lockDatetime.js'
test('existing scheduled lockdown timestamps are shown in the browser local input',()=>{
 const utc='2026-07-10T13:45:00.000Z'
 const local=toDatetimeLocal(utc)
 assert.match(local,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
 assert.equal(toIsoOrNull(local),utc)
 assert.equal(toDatetimeLocal(null),'')
 assert.equal(toDatetimeLocal('not-a-date'),'')
})
test('malformed or backwards lock dates never throw and are rejected',()=>{
 assert.equal(toIsoOrNull('bad'),null)
 assert.match(lockScheduleError('bad',''),/valid scheduled start/)
 assert.match(lockScheduleError('','bad'),/valid reopening/)
 assert.match(lockScheduleError('2026-10-27T19:00','2026-10-27T18:00'),/after/)
 assert.equal(lockScheduleError('2026-10-27T18:00','2026-10-27T19:00'),'')
 assert.match(lockScheduleError('','2026-10-27T18:00',{immediate:true,nowMs:new Date('2026-10-28T08:00').getTime()}),/future/)
 assert.equal(lockScheduleError('','',{immediate:true}),'')
})
test('teacher lockdown form rehydrates existing server schedule and uses the safe parser',()=>{
 const admin=fs.readFileSync(new URL('../../src/Admin.jsx',import.meta.url),'utf8')
 const lock=fs.readFileSync(new URL('../../src/teacher/LockdownView.jsx',import.meta.url),'utf8')
 assert.match(admin,/setLf\(toDatetimeLocal\(cfg\.lock_from\)\)/)
 assert.match(admin,/setLu\(toDatetimeLocal\(cfg\.lock_until\)\)/)
 assert.match(lock,/const iso = toIsoOrNull/)
 assert.match(lock,/disabled=\{Boolean\(immediateError\)\}/)
 assert.match(lock,/if \(scheduleError\)/)
})
