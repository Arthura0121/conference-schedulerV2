import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {ARCADE_GAMES, MODES, arcadeReducer, makeBoard, phaseLength, featuredMode, roundRank, TURNS} from '../../src/student/arcade.js'
import {surfacePosition} from '../../src/themeEffects.js'
import {THEMES,THEME_IDS,safeTheme} from '../../src/themes.js'
const root=new URL('../../',import.meta.url),rd=p=>fs.readFileSync(new URL(p,root),'utf8')

test('theme catalog has exactly the supported safe ids and defaults unknown values to aurora',()=>{
 assert.deepEqual(THEME_IDS,['aurora','fall','halloween','thanksgiving','winter','blossom','firefly','studio-snowday','studio-boardwalk','studio-monsoon','studio-lunar','studio-valentine','studio-newyear','studio-notebook','studio-science'])
 assert.equal(THEMES.length,15);assert.equal(safeTheme('thanksgiving'),'thanksgiving');assert.equal(safeTheme('evil'),'aurora');assert.equal(safeTheme(null),'aurora')
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

test('studio theme RPC, database constraint and control effects cover the same fifteen worlds',()=>{
 const sql=rd('supabase/migrations/007_theme_studio.sql')
 const check=sql.match(/check \(theme in \(([^)]+)\)\)/)[1]
 const allowed=sql.match(/p_theme not in \(([^)]+)\)/)[1]
 const ids=THEME_IDS.map(id=>"'"+id+"'").join(',')
 assert.equal(check,ids)
 assert.equal(allowed,ids)
 assert.match(sql,/perform require_admin\(\)/)
 const css=rd('src/styles/theme-effects.css'),art=rd('src/components/SceneSignature.jsx')
 for(const id of THEME_IDS){
  assert.ok(css.includes('[data-theme="'+id+'"]'))
  assert.ok(art.includes(id))
 }
 assert.deepEqual(surfacePosition({left:10,top:20,width:100,height:40},35,50),[25,75])
 assert.deepEqual(surfacePosition({left:10,top:20,width:100,height:40},-20,300),[0,100])
})

test('student, teacher, provider-level dialogs and lockdown all apply the safe theme',()=>{
 const app=rd('src/App.jsx'),admin=rd('src/Admin.jsx'),lock=rd('src/student/LockScreen.jsx')
 assert.match(app,/data-theme=\{safeTheme\(st\.theme\)\}/)
 assert.match(app,/ThemeScene theme=\{safeTheme\(st\.theme\)\}/)
 assert.match(app,/if \(!admin && st\?\.theme\) applySiteTheme\(st\.theme\)/)
 assert.match(admin,/data-theme=\{safeTheme\(cfg\?\.theme\)\}/)
 assert.match(admin,/ThemeScene theme=\{safeTheme\(cfg\?\.theme\)\}/)
 assert.match(admin,/applySiteTheme\(cfg\?\.theme \|\| publicTheme\)/)
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
 const css=rd('src/styles/themes.css')+rd('src/styles/thanksgiving.css')+rd('src/styles/worlds.css')+rd('src/styles/studio.css')
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

test('every theme has an arcade identity and all games share stationary pads',()=>{
 assert.deepEqual(Object.keys(ARCADE_GAMES),THEME_IDS)
 const css=rd('src/styles/arcade.css')
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
 assert.match(css,/touch-action:manipulation/)
 assert.deepEqual(new Set(THEME_IDS.map(featuredMode)),new Set(Object.keys(MODES)))
 for(const id of THEME_IDS)assert.ok(ARCADE_GAMES[id].prize && ARCADE_GAMES[id].hazard)
 for(const mode of Object.keys(MODES)) {
  const first=makeBoard(mode,'quick',0), last=makeBoard(mode,'quick',TURNS-1)
  const slower=makeBoard(mode,'relaxed',TURNS-1)
  assert.equal(new Set([...last.targets,...last.hazards]).size,last.targets.length+last.hazards.length)
  assert.ok(slower.window>last.window)
  if(mode==='echo')assert.ok(last.targets.length>first.targets.length&&last.pulse<first.pulse)
  if(mode==='rush')assert.ok(last.targets.length>first.targets.length&&last.window<first.window)
  if(mode==='beat')assert.ok(last.zone[1]-last.zone[0]<first.zone[1]-first.zone[0])
 }
})

const beginArcade=(mode,pace='quick')=>arcadeReducer(null,{type:'start',mode,pace,now:0,board:makeBoard(mode,pace,0,()=>.5)})
const playArcade=(round,pad,offset)=>arcadeReducer(round,{type:'pick',phase:round.phase,turn:round.turn,now:round.startedAt+offset,pad})
const tickArcade=(round,offset=phaseLength(round))=>arcadeReducer(round,{
 type:'tick',phase:round.phase,turn:round.turn,now:round.startedAt+offset,
 board:makeBoard(round.mode,round.pace,round.turn+1,()=>.5)
})

test('arcade scores once per clear, multiplies a chain, and ends after twelve boards or three misses',()=>{
 let round=beginArcade('rush')
 for(let turn=0;turn<TURNS;turn++){
  assert.equal(round.turn,turn)
  for(const target of round.board.targets)round=playArcade(round,target,200)
  assert.equal(round.phase,'feedback')
  assert.equal(playArcade(round,round.board.targets[0],201),round)
  round=tickArcade(round)
 }
 assert.equal(round.phase,'done')
 assert.equal(round.cleared,TURNS)
 assert.equal(round.score,7500)
 assert.equal(roundRank(round),'S · Master')

 round=beginArcade('rush')
 round=tickArcade(playArcade(round,round.board.targets[0],300))
 assert.equal(round.combo,1)
 for(let i=0;i<3;i++)round=tickArcade(playArcade(round,round.board.hazards[0],200))
 assert.equal(round.phase,'done')
 assert.equal(round.combo,0)
 assert.equal(round.lives,0)
 assert.equal(round.score,150)
})

test('Echo requires the ordered pattern after preview and ignores earlier input',()=>{
 const preview=beginArcade('echo')
 const [first,second]=preview.board.targets
 assert.equal(playArcade(preview,first,200),preview)
 const round=tickArcade(preview)
 assert.equal(playArcade(round,second,200).outcome,'pattern')
 const partial=playArcade(round,first,200)
 assert.equal(partial.score,0)
 assert.equal(playArcade(partial,second,300).score,150)
})

test('Perfect Beat accepts the hit zone, distinguishes early and late, and rejects a press after the deadline',()=>{
 const round=beginArcade('beat')
 const [start,end]=round.board.zone
 const width=round.board.window
 const [pad]=round.board.targets
 assert.equal(playArcade(round,pad,width*(start-.05)).outcome,'early')
 assert.equal(playArcade(round,pad,width*(end+.05)).outcome,'late')
 assert.equal(playArcade(round,pad,width).outcome,'timeout')
 const perfect=playArcade(round,pad,width*(start+end)/2)
 assert.equal(perfect.outcome,'clear')
 assert.equal(perfect.perfects,1)
})

test('seasonal coverage includes compact calendar and lock-page one-off controls',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of ['fall','halloween','winter']){
  assert.match(css,new RegExp('data-theme="'+id+'"[^]*ad-next-open'))
  assert.match(css,new RegExp('data-theme="'+id+'"[^]*ad-fast-rules-pop'))
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
})

test('seasonal calendar frame and student sidebar inherit the selected theme',()=>{
 const css=rd('src/styles/themes.css')
 for(const id of ['fall','halloween','winter']){
  assert.ok(css.includes('[data-theme="'+id+'"]{--season-frame:'))
 }
 for(const sel of ['.panel','.afterdark-cal .day','.ad-fast-shell','.bnav','.topbar']){
  assert.ok(css.includes(sel),'missing themed surface '+sel)
 }
 assert.doesNotMatch(css,/:is\(\.panel,\.panel-inner,\.panel-home\)/)
 assert.doesNotMatch(css,/:is\(\.ad-calendar-frame,\.days,\.dow\)/)
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


test('teacher schedule period backgrounds are transparent while slot rows remain readable',()=>{
 const css=rd('src/styles/seasonal-components.css')
 const jsx=rd('src/teacher/Schedule.jsx')
 assert.doesNotMatch(css,/\.ad-admin-hero-stat,\.ad-schedule-day \.sper,\.ad-command-distribution/)
 for(const theme of ['fall','halloween','winter']){
  assert.ok(css.includes('.tapp[data-theme="'+theme+'"] .ad-admin-schedule .ad-schedule-day .sper'),'period backdrop missing for '+theme)
 }
 assert.match(css,/background:transparent!important/)
 assert.match(css,/\.srow-wrap>\.pick input\[type="checkbox"\]:checked/)
 assert.match(css,/\.srow-wrap>\.pick input\[type="checkbox"\]:focus-visible/)
 assert.match(jsx,/className="sper"/)
 assert.match(jsx,/type="checkbox" checked=\{checked\.has\(s\.id\)\}/)
})


test('theme-specific native date inputs never inherit navy-blue teacher control backgrounds',()=>{
 const css=rd('src/styles/seasonal-components.css'),teacher=rd('src/teacher/Schedule.jsx')
 for(const theme of ['fall','halloween','winter'])assert.ok(css.includes('.tapp[data-theme="'+theme+'"]'))
 assert.match(css,/\.ad-admin-schedule \.schedule-filter input\[type="date"\]/)
 assert.match(css,/::-webkit-datetime-edit/)
 assert.match(css,/::-webkit-calendar-picker-indicator/)
 assert.match(css,/color-scheme:dark/)
 assert.match(css,/background:var\(--world-cell\)!important/)
 assert.match(css,/color:var\(--world-ink\)!important/)
 assert.match(teacher,/className="mini schedule-filter"/)
 assert.match(teacher,/type="date"/)
})
test('selected schedule presets and filter chips have a high-contrast solid fill',()=>{
 const css=rd('src/styles/seasonal-components.css'),teacher=rd('src/teacher/Schedule.jsx'),book=rd('src/teacher/Bookings.jsx')
 assert.match(css,/\.schedule-date-presets \.chip\[aria-pressed="true"\]/)
 assert.match(css,/\.schedule-status-chips \.chip\[aria-pressed="true"\]/)
 assert.match(css,/\.ad-admin-bookings \.booking-toolbar \.chip\[aria-pressed="true"\]/)
 assert.match(css,/\.student-period-chip\[aria-pressed="true"\]/)
 assert.match(css,/background:var\(--world-accent,var\(--mint\)\)!important/)
 assert.match(css,/color:var\(--world-selection-ink,#19211e\)!important/)
 assert.match(teacher,/aria-pressed=\{range\.from === r\.from && range\.to === r\.to\}/)
 assert.match(book,/aria-pressed=\{flt === k\}/)
})


test('decorative nested rectangles do not turn content wrappers into cards',()=>{
 const css=rd('src/styles/seasonal-components.css')
 const legacy=rd('src/styles/themes.css')
 const overview=rd('src/teacher/Overview.jsx')
 const schedule=rd('src/teacher/Schedule.jsx')
 const booking=rd('src/student/BookingFlow.jsx')
 const student=rd('src/App.jsx')
 assert.match(overview,/className="ad-command-hero"/)
 assert.match(overview,/className="ad-command-body"/)
 assert.match(overview,/className="ad-command-spotlight"/)
 assert.doesNotMatch(css,/:is\(\.ad-admin-pagehero,\.ad-command-hero,\.ad-command-body,/)
 assert.match(css,/\.ad-command-hero>\.ad-command-body/)
 assert.match(css,/\.ad-command-hero>\.ad-command-spotlight/)
 assert.match(css,/background:transparent!important/)
 assert.doesNotMatch(legacy,/:is\(\.panel,\.panel-inner,\.panel-home\)/)
 assert.doesNotMatch(legacy,/:is\(\.ad-calendar-frame,\.days,\.dow\)/)
 assert.match(student,/className="panel-inner"/)
 assert.match(css,/\.panel>\.panel-inner/)
 assert.match(css,/\.panel>\.panel-inner>\.panel-home/)
 assert.match(css,/\.ad-fast-shell>\.ad-calendar-frame/)
 assert.match(css,/\.sched-side>\.empty/)
 assert.match(schedule,/className="sper"/)
 assert.match(css,/\.ad-admin-schedule \.ad-schedule-day \.sper/)
 assert.match(booking,/className="ad-booking-head"/)
 assert.match(css,/\.ad-booking>\.ad-booking-head/)
 assert.match(css,/\.ad-panel-day \.ad-period/)
 for(const theme of ['fall','halloween','winter']){
  assert.ok(css.includes('data-theme="'+theme+'"'))
 }
})


test('layout wrappers remain unpainted and styling imports are not duplicated',()=>{
 const css=rd('src/styles/seasonal-components.css')
 const app=rd('src/App.jsx'),lock=rd('src/student/LockScreen.jsx')
 assert.doesNotMatch(css,/:is\(\.ad-fast-shell,\.ad-calendar-frame\)/)
 assert.doesNotMatch(css,/\.ad-command-hero,\.ad-command-body,\.sched-side/)
 assert.doesNotMatch(css,/\.toolbar,\.ad-admin-bookings \.toolbar,\.rosterbar,\.appointment-export-actions/)
 assert.match(css,/\.ad-command-hero>\.ad-command-body/)
 assert.match(css,/\.ad-fast-shell>\.ad-calendar-frame/)
 assert.doesNotMatch(lock,/import '\.\.\/styles\/themes\.css'/)
 assert.match(app,/import \{call, configured, ensureSession, sb\} from '\.\/sb'/)
})
