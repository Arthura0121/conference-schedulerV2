import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {THEMES,THEME_IDS,safeTheme} from '../../src/themes.js'
const root=new URL('../../',import.meta.url),rd=p=>fs.readFileSync(new URL(p,root),'utf8')

test('theme catalog has exactly the supported safe ids and defaults unknown values to aurora',()=>{
 assert.deepEqual(THEME_IDS,['aurora','fall','halloween','winter'])
 assert.equal(THEMES.length,4);assert.equal(safeTheme('winter'),'winter');assert.equal(safeTheme('evil'),'aurora');assert.equal(safeTheme(null),'aurora')
})
test('theme migration is additive, admin-only and exposes theme through public_state',()=>{
 const s=rd('supabase/migrations/004_v300_themes.sql')
 assert.match(s,/add column theme text not null default 'aurora'/)
 assert.match(s,/check\(theme in \('aurora','fall','halloween','winter'\)\)/)
 assert.match(s,/create function admin_set_theme\(p_theme text\)/)
 assert.match(s,/perform require_admin\(\)/)
 assert.match(s,/update settings set theme=p_theme where id=1/)
 assert.match(s,/'theme',theme/)
 assert.match(s,/revoke execute on function admin_set_theme\(text\) from public,anon/)
 assert.doesNotMatch(s,/drop table|truncate|delete from settings/i)
})
test('student, teacher and lockdown roots apply the safe theme',()=>{
 const app=rd('src/App.jsx'),admin=rd('src/Admin.jsx'),lock=rd('src/student/LockScreen.jsx')
 assert.match(app,/data-theme=\{safeTheme\(st\.theme\)\}/);assert.match(app,/theme=\{safeTheme\(st\.theme\)\}/)
 assert.match(admin,/data-theme=\{safeTheme\(cfg\?\.theme\)\}/)
 assert.match(lock,/data-theme=\{theme\}/)
})
test('teacher theme picker changes only the dedicated theme RPC',()=>{
 const set=rd('src/teacher/SettingsView.jsx'),pick=rd('src/teacher/ThemePicker.jsx')
 assert.match(set,/run\('admin_set_theme', \{p_theme:id\}/)
 assert.match(pick,/role="radiogroup"/);assert.match(pick,/aria-checked/)
 assert.doesNotMatch(pick,/admin_set_available|hold_slot|confirm_booking/)
})
test('all seasonal themes have visual rules and no network assets',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of THEME_IDS.filter(x=>x!=='aurora'))assert.match(css,new RegExp('data-theme="'+id+'"'))
 assert.doesNotMatch(css,/https?:\/\/|@import|@font-face|url\(/i)
})
