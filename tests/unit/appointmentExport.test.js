import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareAppointmentRoster,appointmentRosterHtml} from '../../src/teacher/appointmentExport.js'

const examples=[
 {slot_date:'2026-11-03',start_at:'2026-11-03T14:20:00Z',end_at:'2026-11-03T14:30:00Z',period:3,room:'421',student_name:'Taylor <script>alert(1)</script>',assignment:'Essay & reflection'},
 {slot_date:'2026-11-02',start_at:'2026-11-02T14:00:00Z',period:2,room:'436B',student_name:'Alex Rivera',assignment:'Chapter 5'},
]
test('appointment roster sorts a copy chronologically and keeps private details',()=>{
 const result=prepareAppointmentRoster(examples,Date.parse('2026-11-03T14:00:00Z'))
 assert.equal(result[0].student_name,'Alex Rivera')
 assert.equal(result[0].exportStatus,'Past')
 assert.equal(result[1].exportStatus,'Upcoming')
 assert.equal(examples[0].student_name,'Taylor <script>alert(1)</script>')
})
test('printable roster escapes user names and assignments and shows times, rooms and dates',()=>{
 const html=appointmentRosterHtml(examples,{tz:'America/New_York',generatedAt:new Date('2026-11-01T12:00:00Z'),nowMs:Date.parse('2026-11-03T14:00:00Z')})
 assert.match(html,/Alex Rivera/)
 assert.match(html,/Room|<th>Room<\/th>/)
 assert.match(html,/436B/)
 assert.match(html,/Period 3/)
 assert.match(html,/9:20 AM/)
 assert.match(html,/Essay &amp; reflection/)
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/)
 assert.match(html,/Taylor &lt;script&gt;/)
 assert.match(html,/window.print\(\)/)
 assert.match(html,/Confidential/)
})
test('empty roster produces an explicit empty state',()=>{
 const html=appointmentRosterHtml([])
 assert.match(html,/No booked appointments to export/)
 assert.match(html,/Total bookings/)
})
