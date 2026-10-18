import test from 'node:test'
import assert from 'node:assert/strict'
import {validateNewSlot} from '../../src/teacher/scheduleValidation.js'
const good={date:'2026-10-27',period:3,start:'09:46',end:'09:56',room:'407'}
test('valid new conference slot passes client validation',()=>{
 assert.equal(validateNewSlot(good),'')
 assert.equal(validateNewSlot({...good,period:'9',room:' TES '}),'')
})
test('missing or invalid dates and periods cannot be submitted',()=>{
 for(const date of ['',null,'2026-02-30','2026/10/27'])assert.match(validateNewSlot({...good,date}),/valid date/)
 for(const period of [0,10,2.5,'abc'])assert.match(validateNewSlot({...good,period}),/Period/)
})
test('invalid times and blank room are reported before the database call',()=>{
 for(const end of ['09:45','09:46','','25:00'])assert.match(validateNewSlot({...good,end}),/time/i)
 assert.match(validateNewSlot({...good,start:'99:00'}),/time/i)
 assert.match(validateNewSlot({...good,room:'  '}),/room/i)
})
