import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs'
import {publicName,rosterGroups,rosterStatus,filterRoster,unhideExposes,HIDDEN_LABEL,CONSENT_LABEL} from '../../src/roster.js'
const sql=fs.readFileSync(new URL('../../supabase/migrations/003_v240_realtime_bulk_roster.sql',import.meta.url),'utf8').replace(/--[^\n]*/g,'')
const fn=n=>new RegExp('create function '+n+'\\(.*?\\$\\$;','s').exec(sql)[0]
test('database: list_roster returns nothing when the switch is off, only consented AND unhidden names, never assignment or ids',()=>{
  const f=fn('list_roster');assert.match(f,/st\.public_roster/);assert.match(f,/case when b\.show_name and not b\.name_hidden then b\.name else null end/)
  const ret=/returns table\((.*?)\)/s.exec(f)[1];assert.doesNotMatch(ret,/assignment|student|auth|booking|email|slot_id|\bid\b/i);const sel=/select (.*?) from slots s/s.exec(f)[1];assert.doesNotMatch(sel,/assignment|student|slot_id|auth/i)
  assert.match(f,/auth\.uid\(\) is not null/);assert.match(f,/not is_locked\(\)/);assert.match(f,/not s\.draft/);assert.match(f,/s\.start_at>now\(\)/)})
test('database: existing and new bookings default to PRIVATE; imported paper slots have no booking rows so stay anonymous',()=>{
  assert.match(sql,/add column if not exists show_name boolean not null default false/);assert.match(sql,/add column if not exists name_hidden boolean not null default false/);assert.match(sql,/add column if not exists public_roster boolean not null default false/)
  assert.match(fn('confirm_booking'),/p_show_name boolean default false/);assert.match(fn('confirm_booking'),/coalesce\(p_show_name,false\)/)
  assert.doesNotMatch(sql,/update bookings set show_name\s*=\s*true/i,'no migration statement grants consent')})
test('database: the teacher can only hide/un-hide; no function lets a teacher set student consent; students can only touch their own row',()=>{
  const setters=[...sql.matchAll(/set show_name\s*=/g)];assert.equal(setters.length,1);assert.match(fn('set_my_roster_consent'),/where student=auth\.uid\(\)/);assert.doesNotMatch(fn('admin_set_name_hidden'),/show_name\s*=/)
  assert.match(fn('admin_set_name_hidden'),/require_admin\(\)/);assert.match(fn('admin_set_roster_public'),/require_admin\(\)/);assert.match(fn('set_my_roster_consent'),/not_signed_in/)})
test('database: consent withdrawal works during lockdown; teacher hide overrides consent in every view (list_roster, my_booking, admin_bookings)',()=>{
  assert.doesNotMatch(fn('set_my_roster_consent'),/is_locked/);for(const n of ['list_roster','my_booking','admin_bookings'])assert.match(fn(n),/not (?:b\.)?name_hidden/,n)})
test('database: roster events carry no names (meta has only counts/flags)',()=>{for(const n of ['admin_set_name_hidden','admin_set_roster_public'])assert.doesNotMatch(fn(n),/\.name\b|assignment/)})
test('client: hidden or missing display names are never reconstructed; label is the required text',()=>{
  assert.equal(HIDDEN_LABEL,'Reserved — name hidden');assert.equal(publicName({display_name:null,name_hidden:true}),HIDDEN_LABEL);assert.equal(publicName({display_name:'Sam P.',name_hidden:false}),'Sam P.');assert.equal(publicName({display_name:'Leak',name_hidden:true}),HIDDEN_LABEL,'even if a name slipped in, a hidden flag wins')
  assert.equal(CONSENT_LABEL,'Allow my display name to appear on the class conference roster.')
  const g=rosterGroups([{start_at:'2026-10-20T13:46:00Z',room:'407',period:3,display_name:null,name_hidden:true},{start_at:'2026-10-20T14:00:00Z',room:'407',period:3,display_name:'Ana',name_hidden:false}],'America/New_York');assert.equal(g.length,1);assert.deepEqual(g[0].items.map(i=>i.label),[HIDDEN_LABEL,'Ana'])
  for(const row of g[0].items)assert.deepEqual(Object.keys(row).sort(),['display_name','label','name_hidden','period','room','start_at'])})
test('teacher status: hidden beats consent; no consent is private; public only when roster ON; filters work',()=>{
  const b=(c,h)=>({roster_consent:c,name_hidden:h});assert.equal(rosterStatus(b(true,true),true),'hidden');assert.equal(rosterStatus(b(false,false),true),'no_consent');assert.equal(rosterStatus(b(true,false),true),'public');assert.equal(rosterStatus(b(true,false),false),'consented')
  const all=[b(true,false),b(false,false),b(true,true)];assert.equal(filterRoster(all,'public',true).length,1);assert.equal(filterRoster(all,'no_consent',true).length,1);assert.equal(filterRoster(all,'all',true).length,3);assert.equal(unhideExposes(b(false,true)),false)})
test('UI: consent checkbox is optional and unchecked by default; booking does not require it; dialogs, not alerts',()=>{
  const bf=fs.readFileSync(new URL('../../src/student/BookingFlow.jsx',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../../src/App.jsx',import.meta.url),'utf8')
  assert.match(bf,/consent = false/);assert.doesNotMatch(bf,/consent.*required|required.*consent/);assert.match(app,/\[consent, setConsent\] = useState\(false\)/);assert.match(app,/p_show_name: consent/)
  assert.match(app,/call\('list_roster'\)/);assert.match(app,/a\.roster_on/)
  const set=fs.readFileSync(new URL('../../src/teacher/SettingsView.jsx',import.meta.url),'utf8');assert.match(set,/school.s approval/i);assert.match(set,/useConfirm/)})
