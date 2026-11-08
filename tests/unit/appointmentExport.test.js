import test from 'node:test'
import assert from 'node:assert/strict'
import {prepareAppointmentRoster,appointmentRosterHtml,scheduleHtml} from '../../src/teacher/appointmentExport.js'
import {THEMES} from '../../src/themes.js'

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

test('all site themes produce matching, self-contained roster and schedule artwork',()=>{
 const marks=new Set()
 for(const {id,name} of THEMES){
  const roster=appointmentRosterHtml(examples,{theme:id})
  const schedule=scheduleHtml(examples,{theme:id})
  for(const html of [roster,schedule]){
   assert.ok(html.includes('data-theme="'+id+'"'))
   assert.ok(html.includes(name))
   assert.match(html,/@media print/)
   assert.doesNotMatch(html,/<(?:script|link|img)\b|url\(/i)
  }
  marks.add(roster.match(/<path d="([^"]+)"/)[1])
 }
 assert.equal(marks.size,THEMES.length)
 const fallback=appointmentRosterHtml([], {theme:'"><script>bad</script>'})
 assert.match(fallback,/data-theme="aurora"/)
 assert.doesNotMatch(fallback,/<script>/)
})

test('schedule groups slots by date and keeps statuses without copying student details',()=>{
 const slots=[{...examples[0],booked:true},{...examples[1],available:false,reason:'Taken on paper'}]
 const html=scheduleHtml(slots,{theme:'winter',nowMs:Date.parse('2026-11-03T00:00:00Z'),range:{from:'2026-11-02',to:'2026-11-03'}})
 assert.ok(html.indexOf('Mon, Nov 2, 2026')<html.indexOf('Tue, Nov 3, 2026'))
 assert.match(html,/Taken on paper · Past/)
 assert.match(html,/Booked online/)
 assert.match(html,/9:20 AM – 9:30 AM/)
 assert.doesNotMatch(html,/Alex Rivera|Taylor|Essay|Chapter 5/)
})
