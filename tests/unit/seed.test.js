import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs'
const rd=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8')
const seed=rd('../../supabase/seed.sql'),pdf=JSON.parse(rd('../fixtures/pdf_grid.json'))   // fixture = codes read from the PDF tables by script, no names
const rows=[...seed.matchAll(/\('(\d{4}-\d\d-\d\d)',(\d),'([NPO]{3})'\)/g)].map(m=>({date:m[1],period:+m[2],code:m[3]}))
const slots=(rs)=>rs.flatMap(r=>[...r.code].map((c,i)=>({...r,n:i+1,c,available:c==='O',reason:c==='N'?'Not available':c==='P'?'Taken on paper sign-up sheet':null})))  // mirrors the SQL CASE in seed.sql
const count=(ss,f)=>ss.filter(f).length
test('seed grid equals the grid read from the PDFs (all 60 day/period rows)',()=>{assert.equal(rows.length,60);assert.deepEqual([...rows].sort((a,b)=>a.date.localeCompare(b.date)||a.period-b.period),[...pdf].sort((a,b)=>a.date.localeCompare(b.date)||a.period-b.period))})
test('SQL expansion rules in seed.sql are the ones this test mirrors',()=>{assert.match(seed,/substr\(g\.code,t\.n,1\)='O'/);assert.match(seed,/when 'N' then 'Not available' when 'P' then 'Taken on paper sign-up sheet'/)})
test('all 180 slots: 70 not-available, 109 paper-signup, 1 open',()=>{const s=slots(rows);assert.equal(s.length,180);assert.equal(count(s,x=>x.c==='N'),70);assert.equal(count(s,x=>x.c==='P'),109);assert.equal(count(s,x=>x.available),1)})
test('the single open slot is Wed 9/30 Period 9, third slot (already past)',()=>{const o=slots(rows).filter(x=>x.available);assert.deepEqual([o[0].date,o[0].period,o[0].n],['2026-09-30',9,3])})
test('from 10/13 on (still bookable): 48 slots = 21 N + 27 P + 0 open',()=>{const s=slots(rows).filter(x=>x.date>='2026-10-13');assert.equal(s.length,48);assert.equal(count(s,x=>x.c==='N'),21);assert.equal(count(s,x=>x.c==='P'),27);assert.equal(count(s,x=>x.available),0)})
test('Mon 10/12 and Wed 10/14 are entirely not available',()=>{const s=slots(rows).filter(x=>['2026-10-12','2026-10-14'].includes(x.date));assert.equal(s.length,24);assert.ok(s.every(x=>x.c==='N'))})
test('all dates are Mon-Fri',()=>{for(const r of rows){const d=new Date(r.date+'T12:00:00Z').getUTCDay();assert.ok(d>=1&&d<=5,r.date)}})
test('period 7 room is 436B from 10/5, 422 before',()=>{assert.match(seed,/g\.period=7 and g\.d::date<date '2026-10-05' then '422'/);assert.match(seed,/\(7,1,'13:00','13:10','436B'\)/)})
test('seed contains no student data: every quoted literal is an allowed constant (no names anywhere)',()=>{
 const code=seed.split('\n').filter(l=>!l.trim().startsWith('--')).join('\n')
 const allowed=[/^[NPO]$/,/^\d{4}-\d\d-\d\d$/,/^[NPO]{3}$/,/^\d\d:\d\d$/,/^(407|422|436B)$/,/^(Not available|Taken on paper sign-up sheet|America\/New_York|NPO)$/]
 const lits=[...code.matchAll(/'([^']*)'/g)].map(m=>m[1]);assert.ok(lits.length>=156,"literal scan found too little: "+lits.length)
 for(const l of lits)assert.ok(allowed.some(r=>r.test(l)),'unexpected literal in seed: '+l)
 assert.ok(!/[A-Z][a-z]+ [A-Z][a-z]+/.test(seed.split('\n').filter(l=>l.trim().startsWith('--')).join(' ').replace(/Not Available|Wed 9\/30|Period \d/g,'')),'comment looks like it has a name')
 assert.deepEqual([...new Set(pdf.flatMap(r=>Object.keys(r)))].sort(),['code','date','period'])})
