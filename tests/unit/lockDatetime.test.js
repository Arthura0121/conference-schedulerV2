import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {toDatetimeLocal,toIsoOrNull,lockScheduleError,recurringLockError} from '../../src/teacher/lockDatetime.js'
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
test('recurring wall-clock inputs validate a repeat interval without using the browser time zone',()=>{
 assert.equal(recurringLockError('2027-03-14T02:30','2027-03-14T04:00',1,'day'),'')
 assert.equal(recurringLockError('2027-03-14T22:00','2027-03-16T07:00',1,'week'),'')
 assert.match(recurringLockError('2027-03-14T22:00','2027-03-16T07:00',1,'day'),/shorter/)
 assert.match(recurringLockError('2027-03-14T22:00','2027-03-14T23:00',31,'week'),/1 to 30/)
 assert.match(recurringLockError('2027-03-14T22:00','2027-03-14T23:00',1,'invalid'),/repeat interval/)
})
test('manual and scheduled actions use separate RPCs and keys',()=>{
 const admin=fs.readFileSync(new URL('../../src/Admin.jsx',import.meta.url),'utf8')
 const lock=fs.readFileSync(new URL('../../src/teacher/LockdownView.jsx',import.meta.url),'utf8')
 assert.match(admin,/next_lock_change/)
 assert.match(lock,/useState\(\(\)=>toDatetimeLocal\(cfg\.lock_from\)\)/)
 for(const rpc of ['admin_set_manual_lock','admin_set_lock_schedule','admin_set_recurring_lock'])assert.ok(lock.includes(rpc))
})
