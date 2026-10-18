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
 const s=rd('supabase/migrations/004_v300_themes.sql'),rt=rd('supabase/migrations/003_v240_realtime_bulk_roster.sql')
 assert.match(s,/add column theme text not null default 'aurora'/)
 assert.match(s,/check\(theme in \('aurora','fall','halloween','winter'\)\)/)
 assert.match(s,/create function admin_set_theme\(p_theme text\)/)
 assert.match(s,/perform require_admin\(\)/)
 assert.match(s,/update settings set theme=p_theme where id=1/)
 assert.match(s,/'theme',theme/)
 assert.match(s,/revoke execute on function admin_set_theme\(text\) from public,anon/)
 assert.match(rt,/create trigger rt_settings_u after update on settings/)
 assert.doesNotMatch(s,/drop table|truncate|delete from settings/i)
})

test('student, teacher, provider-level dialogs and lockdown all apply the safe theme',()=>{
 const app=rd('src/App.jsx'),admin=rd('src/Admin.jsx'),lock=rd('src/student/LockScreen.jsx')
 assert.match(app,/data-theme=\{safeTheme\(st\.theme\)\}/)
 assert.match(app,/ThemeScene theme=\{safeTheme\(st\.theme\)\}/)
 assert.match(app,/document\.documentElement\.dataset\.theme = safeTheme\(st\?\.theme\)/)
 assert.match(admin,/data-theme=\{safeTheme\(cfg\?\.theme\)\}/)
 assert.match(admin,/ThemeScene theme=\{safeTheme\(cfg\?\.theme\)\}/)
 assert.match(admin,/document\.documentElement\.dataset\.theme=safeTheme\(cfg\?\.theme\)/)
 assert.match(lock,/data-theme=\{theme\}/);assert.match(lock,/ThemeScene theme=\{theme\}/)
})

test('Aurora alone uses Starfield; seasonal themes render their own scene objects',()=>{
 const scene=rd('src/components/ThemeScene.jsx')
 assert.match(scene,/theme === 'aurora'.*Starfield/s)
 assert.match(scene,/theme === 'fall'/)
 assert.match(scene,/fallLeaves/)
 assert.match(scene,/fall-acorn/)
 assert.match(scene,/theme === 'halloween'/)
 assert.match(scene,/hallow-bats/)
 assert.match(scene,/hallow-candy/)
 assert.match(scene,/pumpkin/)
 assert.match(scene,/skeleton/)
 assert.match(scene,/winter-snow/)
 assert.match(scene,/winter-lights/)
 assert.match(scene,/winter-pines/)
 assert.match(scene,/winter-gift/)
})

test('teacher theme picker changes only the dedicated theme RPC',()=>{
 const set=rd('src/teacher/SettingsView.jsx'),pick=rd('src/teacher/ThemePicker.jsx')
 assert.match(set,/run\('admin_set_theme', \{p_theme:id\}/)
 assert.match(pick,/role="radiogroup"/);assert.match(pick,/aria-checked/)
 assert.doesNotMatch(pick,/admin_set_available|hold_slot|confirm_booking/)
})

test('seasonal themes redesign backgrounds, controls, calendar, nav, cards, dialogs and teacher heroes',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of THEME_IDS.filter(x=>x!=='aurora'))assert.match(css,new RegExp('data-theme="'+id+'"'))
 for(const token of ['theme-scene-fall','theme-scene-halloween','theme-scene-winter','\.btn\.primary','afterdark-cal \\.day','rail-dock','trail-dock','dialog\\.sheet','ad-command-hero','ad-admin-pagehero','student-period-chip'])assert.match(css,new RegExp(token))
 assert.match(css,/fall-leaf/)
 assert.match(css,/bat-fly/)
 assert.match(css,/candy-fall/)
 assert.match(css,/snowfall/)
 assert.match(css,/winter-bulb/)
 assert.doesNotMatch(css,/https?:\/\/|@import|@font-face|url\(/i)
})

test('seasonal themes also cover booking flow, success celebration, roster, teacher rush, bulk controls and focus states',()=>{
 const css=rd('src/styles/themes.css')
 for(const token of ['ad-booking-ticket','ad-hold','ad-success','burst i','ad-mybooking','rlist li','ad-rush-mode','ad-rush-grid','bulkbar','lockhero','srow\\[aria-pressed','brow\\[aria-pressed','field input','focus-visible'])assert.match(css,new RegExp(token))
 assert.match(css,/data-theme="fall"[^]*\.burst i/)
 assert.match(css,/data-theme="halloween"[^]*\.burst i/)
 assert.match(css,/data-theme="winter"[^]*\.burst i/)
})

test('locked-page hidden game has a matching identity for every theme',()=>{
 const lock=rd('src/student/LockScreen.jsx'),css=rd('src/styles/themes.css')
 for(const name of ['STARFALL','LEAF RUN','CANDY HUNT','SNOWFALL'])assert.match(lock,new RegExp(name))
 for(const word of ['golden leaf','Halloween candy','snowflake'])assert.match(lock,new RegExp(word))
 for(const id of ['fall','halloween','winter'])assert.match(css,new RegExp('ad-cosmos\\[data-theme="'+id+'"\\] \\.cosmos-secret'))
})

test('seasonal coverage includes compact calendar and lock-page one-off controls',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of ['fall','halloween','winter']){
  assert.match(css,new RegExp('data-theme="'+id+'"[^]*ad-next-open'))
  assert.match(css,new RegExp('data-theme="'+id+'"[^]*ad-fast-rules-pop'))
  assert.match(css,new RegExp('ad-cosmos\\[data-theme="'+id+'"\\][^]*cosmos-easter'))
  assert.match(css,new RegExp('ad-cosmos\\[data-theme="'+id+'"\\][^]*soundbtn'))
 }
 assert.match(css,/max-width:700px[^]*leaf:nth-child\(n\+25\)/)
 assert.match(css,/max-width:700px[^]*flake:nth-child\(n\+41\)/)
})

test('winter has a full Santa sleigh flight and all seasonal worlds have extra scene decoration',()=>{
 const scene=rd('src/components/ThemeScene.jsx'),css=rd('src/styles/themes.css'),figures=rd('src/components/SeasonalFigures.jsx')
 for(const token of ['winter-santa-flight','reindeer-1','reindeer-4','sleigh-lines','gift-stack','SantaFigure','ReindeerFigure','winter-village','winter-wreath','winter-stars'])assert.match(scene,new RegExp(token))
 for(const token of ['export function ReindeerFigure','export function SantaFigure','viewBox="0 0 110 100"','viewBox="0 0 96 106"'])assert.ok(figures.includes(token),'missing connected SVG figure: '+token)
 assert.match(scene,/import \{ReindeerFigure, SantaFigure\} from '\.\/SeasonalFigures\.jsx'/)
 assert.doesNotMatch(scene,/className="santa-head"|className="santa-arm"/)
 for(const token of ['santa-flight','santa-wave','reindeer','sleigh-body','gift-stack','winter-house','winter-wreath','winter-twinkle'])assert.match(css,new RegExp(token))
 for(const token of ['fall-lantern','fall-scarecrow','hallow-spiderweb','hallow-ghost'])assert.match(scene,new RegExp(token))
 assert.match(css,/--santa-scale/)
 assert.match(css,/scale\(var\(--santa-scale\)\)/)
})

test('all seasonal illustration types use unified SVG decals',()=>{
 const scene=rd('src/components/ThemeScene.jsx'),decals=rd('src/components/SeasonalDecals.jsx'),figures=rd('src/components/SeasonalFigures.jsx'),css=rd('src/styles/themes.css')
 for(const name of ['Acorn','Lantern','Scarecrow','Bat','Candy','Ghost','Skeleton','Pumpkin','Gift','House','Pine','Wreath','Snowman']){
  assert.match(decals,new RegExp('export function '+name+'\\('))
  assert.match(scene,new RegExp('<'+name+'\\s*\\/?>'))
 }
 for(const name of ['SantaFigure','ReindeerFigure'])assert.match(figures,new RegExp('export function '+name+'\\('))
 assert.match(css,/\.seasonal-decal\{display:block/)
 assert.doesNotMatch(scene,/className="skull"|className="santa-head"|className="santa-arm"|className="rib /)
})

test('reduced motion disables seasonal animation and trims decorative density',()=>{
 const css=rd('src/styles/themes.css')
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
 assert.match(css,/\.theme-scene \*\{animation:none!important\}/)
})

test('winter snowfall layers behind decorated Christmas trees, houses and snowmen',()=>{
 const css=rd('src/styles/themes.css'),scene=rd('src/components/ThemeScene.jsx'),art=rd('src/components/SeasonalDecals.jsx')
 assert.match(scene,/winter-snowmen/)
 assert.match(scene,/<Snowman\/>/)
 assert.match(art,/export function Snowman\(/)
 assert.match(art,/export function Pine\(/)
 for(const [selector,layer] of [['winter-snow',2],['winter-pines',5],['winter-village',6],['winter-snowmen',7]])assert.ok(css.includes('.theme-scene-winter .'+selector+'{z-index:'+layer+'}'))
})

test('winter snowbank ovals are replaced by subtle background ground and richer houses',()=>{
 const scene=rd('src/components/ThemeScene.jsx'),css=rd('src/styles/themes.css'),art=rd('src/components/SeasonalDecals.jsx')
 assert.doesNotMatch(scene,/winter-snowbank bank-a|winter-snowbank bank-b/)
 assert.match(scene,/winter-ground/)
 assert.match(scene,/chimney-smoke/)
 assert.match(css,/\.theme-scene-winter \.winter-snowbank\{display:none!important\}/)
 assert.match(css,/winter-window-glow/)
 assert.match(css,/christmas-light/)
 assert.match(art,/house-window/)
})

test('winter ground snowdrifts override the legacy decoration reset',()=>{
 const css=rd('src/styles/themes.css')
 const base=css.lastIndexOf('/* Short snowdrifts around each base')
 assert.ok(base>=0)
 const patch=css.slice(base)
 assert.match(patch,/content:""!important/)
 assert.match(patch,/winter-house::after/)
 assert.match(patch,/winter-pines i::before/)
 assert.match(patch,/winter-snowmen \.snowman::after/)
})


test('seasonal themes replace inherited focus rings, pressed effects and celebration shapes',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of ['fall','halloween','winter']){
  assert.match(css,new RegExp('data-theme="'+id+'"'))
  assert.match(css,new RegExp('\\[data-theme="'+id+'"\\] \\.burst i'))
 }
 for(const token of ['--theme-accent','--theme-edge','focus-visible','aria-pressed="true"','prefers-reduced-motion'])assert.ok(css.includes(token))
 assert.match(css,/\.ad-success-emblem/)
 assert.match(css,/\.cosmos-secret-begin/)
})

test('seasonal calendar frame and student sidebar inherit the selected theme',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of ['fall','halloween','winter']){
  assert.ok(css.includes('[data-theme="'+id+'"]{--season-frame:'))
 }
 for(const sel of ['.ad-calendar-frame','.panel-home','.panel-inner','.afterdark-cal .day','.ad-fast-shell','.bnav','.topbar']){
  assert.ok(css.includes(sel),'missing themed surface '+sel)
 }
 assert.match(css,/--season-frame-edge/)
 assert.match(css,/--season-panel/)
})


test('all seasonal worlds style student roster and every interactive page surface',()=>{
 const css=rd('src/styles/seasonal-components.css')
 const student=rd('src/App.jsx'),teacher=rd('src/Admin.jsx')
 const roster=rd('src/student/Roster.jsx')
 for(const theme of ['fall','halloween','winter']){
  for(const root of ['.app','.tapp']){
   assert.ok(css.includes(root+'[data-theme="'+theme+'"]'),'missing '+theme+' '+root+' world')
  }
  assert.ok(css.includes('.app[data-theme="'+theme+'"] .ad-student-roster'),'unmatched public roster in '+theme)
 }
 const screens=['.ad-student-roster','.rlist li','.ad-calendar-frame','.ad-fast-shell','.afterdark-cal .day','.student-period-chip','.ad-student-list .listday','.ad-day-hero','.ad-booking-head','.ad-hold','.ad-success','.panel-home','.ad-admin-pagehero','.sched-side','.appointment-export-actions','.theme-choice','.ad-booking-ticket']
 for(const surface of screens)assert.ok(css.includes(surface),'not covered: '+surface)
 assert.ok(css.includes('.ad-student-roster .rname.hid'),'private roster label lost')
 assert.match(roster,/HIDDEN_LABEL/)
 assert.ok(!css.includes('data-theme="aurora"'),'Aurora should keep its own untouched styles')
 for(const source of [student,teacher]){
  assert.ok(source.includes("import './styles/seasonal-components.css'"))
  assert.ok(source.indexOf("import './styles/seasonal-components.css'")>source.indexOf("import './styles/themes.css'"),'seasonal overrides must load last')
 }
})
