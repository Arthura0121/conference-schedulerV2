import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const root=new URL('../../',import.meta.url)
const rd=p=>fs.readFileSync(new URL(p,root),'utf8')

test('student rush path has one-tap next opening, name-only session memory and race recovery',()=>{
  const app=rd('src/App.jsx'), cal=rd('src/student/MonthCalendar.jsx')
  assert.match(app,/ss\.get\('student_name'\)/)
  assert.match(app,/ss\.set\('student_name', name\)/)
  assert.match(app,/\[asg, setAsg\] = useState\(''\)/)
  assert.doesNotMatch(app,/ss\.get\('student_assignment'\)/)
  assert.doesNotMatch(app,/ss\.set\('student_assignment'/)
  assert.match(app,/ss\.del\('student_assignment'\)/)
  assert.match(app,/const nextSlot = openSlots\[0\]/)
  assert.match(app,/Someone grabbed that time first/)
  assert.match(app,/raceLost\.alts/)
  assert.match(cal,/Next open/)
  assert.doesNotMatch(cal,/ad-live-count|LIVE|SYNCING|OFFLINE/,'connection status should not duplicate in month statistics')
  assert.match(app,/<TopBar title=\{TITLES\[view\]\} live=\{live\}/)
  assert.match(app,/<LiveBadge status=\{live\}/)
})

test('student period filter controls calendar, times, next-open and race alternatives',()=>{
  const app=rd('src/App.jsx'), pf=rd('src/student/PeriodFilter.jsx')
  assert.match(app,/student_period/)
  assert.match(app,/const periodSlots = periodFilter === 'all'/)
  assert.match(app,/const groups = groupSlots\(periodSlots, tz\)/)
  assert.match(app,/const openSlots = periodSlots\.filter/)
  assert.match(app,/String\(x\.period\) === periodFilter/)
  assert.match(app,/No Period \$\{periodFilter\} times right now/)
  assert.match(pf,/All periods/)
  assert.match(pf,/Period \{p\}/)
  assert.match(pf,/openCounts/)
})

test('student period filter automatically returns to all periods if that period disappears live',()=>{
  const app=rd('src/App.jsx')
  assert.match(app,/slots\.some\(s => String\(s\.period\) === periodFilter\)/)
  assert.match(app,/setPeriodFilter\('all'\)/)
  assert.match(app,/setDate\(null\)/)
  assert.match(app,/No appointments are available for Period \$\{oldPeriod\} anymore\. Showing all periods\./)
})

test('student day and list views prioritize open appointments',()=>{
  const day=rd('src/student/DayPanel.jsx'), list=rd('src/student/ListView.jsx')
  assert.match(day,/showClosed/)
  assert.match(day,/ordered\.filter\(s => s\.state === 'open'\)/)
  assert.match(list,/useState\(true\)/)
  assert.match(list,/ss\.filter\(s => s\.state === 'open'\)/)
})

test('teacher has a protected publish-and-open day workflow and Rush Mode',()=>{
  const sched=rd('src/teacher/Schedule.jsx'), ov=rd('src/teacher/Overview.jsx')
  assert.match(sched,/Publish &amp; open day/)
  assert.match(sched,/admin_publish_range/)
  assert.doesNotMatch(sched,/admin_bulk_set_available/)
  assert.match(sched,/mode: 'release-day'/)
  assert.match(sched,/BulkDialog/)
  assert.match(ov,/Start Rush Mode/)
  assert.match(ov,/net booked since Rush Mode started/)
  assert.match(ov,/not the number of students viewing the page/)
})

test('stress harness is TEST-only gated and proves exactly one hold winner',()=>{
  const s=rd('scripts/stress-booking.mjs')
  assert.match(s,/I_AM_USING_CONFERENCE_TEST/)
  assert.match(s,/STRESS_SLOT_ID/)
  assert.match(s,/Expected exactly ONE hold winner/)
  assert.match(s,/release_my_hold/)
  assert.doesNotMatch(s,/confirm_booking/)
})

test('v3 device matrix explicitly covers portrait, landscape and rotation',()=>{
  const d=rd('DEVICE_TEST_V3.md')
  assert.match(d,/Small iPhone/)
  assert.match(d,/Android phone/)
  assert.match(d,/Landscape/)
  assert.match(d,/Rotation torture test/)
  assert.match(d,/npm run test:stress/)
})
