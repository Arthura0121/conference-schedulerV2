import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {THEME_IDS,safeTheme} from '../../src/themes.js'
const rd=path=>fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8')

test('theme stays consistent when changing between student, login and teacher pages',()=>{
 const app=rd('src/App.jsx'),admin=rd('src/Admin.jsx'),util=rd('src/themes.js')
 assert.match(util,/export function rememberedTheme\(/)
 assert.match(util,/export function applySiteTheme\(/)
 assert.match(util,/localStorage\.setItem\(THEME_KEY, theme\)/)
 assert.match(app,/if \(!admin && st\?\.theme\) applySiteTheme\(st\.theme\)/)
 assert.match(admin,/applySiteTheme\(cfg\?\.theme \|\| publicTheme\)/)
 assert.match(admin,/call\('public_state'\)/)
 assert.match(admin,/useState\(rememberedTheme\)/)
 assert.match(admin,/<SignIn theme=\{publicTheme\}/)
 assert.match(admin,/<TeacherLoading theme=\{publicTheme\}/)
})
test('every initial state is themed, not a legacy blue splash screen',()=>{
 const app=rd('src/App.jsx'),status=rd('src/components/StatusScreen.jsx')
 const teacher=rd('src/teacher/Shell.jsx'),admin=rd('src/Admin.jsx')
 assert.match(app,/<StatusScreen theme=\{rememberedTheme\(\)\}/)
 assert.match(status,/className="site-status"/)
 assert.match(status,/<ThemeScene theme=\{visual\}/)
 assert.match(teacher,/function TeacherAuthScene/)
 assert.match(teacher,/className="teacher-auth"/)
 assert.match(teacher,/className="teacher-auth-loading"/)
 assert.match(admin,/if \(ok === null\) return <TeacherLoading/)
})
test('teacher sign-in uses server public theme and keeps staff authentication guarded',()=>{
 const src=rd('src/teacher/Shell.jsx'),admin=rd('src/Admin.jsx')
 assert.match(src,/<ThemeScene theme=\{visual\}/)
 assert.match(src,/className="teacher-auth-story"/)
 assert.match(src,/className="teacher-auth-form-wrap"/)
 assert.match(src,/autoComplete="username"/)
 assert.match(src,/autoComplete="current-password"/)
 assert.match(src,/className="teacher-auth-reveal"/)
 assert.match(src,/aria-pressed=\{reveal\}/)
 assert.match(src,/disabled=\{busy\}/)
 assert.match(src,/disabled=\{!em\.trim\(\)\|\|!pw\}/)
 assert.match(src,/role="alert"/)
 assert.match(src,/href="#"/)
 assert.match(admin,/if\(signingIn\)return/)
 assert.match(admin,/sb\.auth\.signInWithPassword\(/)
 assert.match(admin,/setPw\(''\)/)
})
test('cross-page visual system covers auth, settings, roster, calendar, schedules, modals and empty screens',()=>{
 const css=rd('src/styles/app-completion.css'),entry=rd('src/Admin.jsx'),app=rd('src/App.jsx')
 for(const id of THEME_IDS){
  assert.match(css,new RegExp('teacher-auth\\[data-theme="'+id+'"\\]'))
 }
 for(const id of THEME_IDS.filter(x=>x!=='aurora')){
  assert.match(css,new RegExp('site-status\\[data-theme="'+id+'"\\]'))
  assert.match(css,new RegExp(':root\\[data-theme="'+id+'"\\]'))
 }
 for(const part of ['.teacher-auth-form-wrap','.teacher-auth-loading','.teacher-auth-story','.teacher-auth-mobile-return','.site-status-card','dialog.sheet','.sheet-foot','.confirm','.empty','.field input',':focus-visible']){
  assert.ok(css.includes(part),'missing '+part)
 }
 for(const path of ['src/student/BookingFlow.jsx','src/student/Success.jsx','src/student/DayPanel.jsx','src/student/ListView.jsx','src/student/Roster.jsx','src/teacher/Overview.jsx','src/teacher/Schedule.jsx','src/teacher/Bookings.jsx','src/teacher/SettingsView.jsx','src/teacher/LockdownView.jsx','src/student/LockScreen.jsx']){
  assert.ok(rd(path).length>200,path+' must exist and be inspected')
 }
 for(const source of [entry,app])assert.match(source,/import '\.\/styles\/app-completion\.css'/)
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length)
})
test('theme fallback rejects unsupported persisted values',()=>{
 assert.equal(safeTheme('halloween'),'halloween')
 assert.equal(safeTheme('<script>'),'aurora')
})

test('teacher mobile navigation and scroll viewport match student app guarantees',()=>{
 const css=rd('src/styles/app-completion.css'),shell=rd('src/teacher/Shell.jsx')
 assert.match(shell,/className="teacher-top-student"/)
 assert.match(shell,/aria-label="Student page"/)
 assert.match(shell,/className="bnav five"/)
 assert.match(css,/body:has\(\.tapp:not\(\.wide\)\)/)
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto/)
 assert.match(css,/\.tapp:not\(\.wide\)>\.ttop/)
 assert.match(css,/\.tapp:not\(\.wide\)>\.tmain/)
 assert.match(css,/\.tapp:not\(\.wide\)>\.bnav\.five/)
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/)
 assert.match(css,/overscroll-behavior-y:contain/)
})
test('authorization and connection recovery are safe at the teacher entry point',()=>{
 const admin=rd('src/Admin.jsx'),shell=rd('src/teacher/Shell.jsx')
 assert.match(admin,/const authorized = await call\('admin_check'\)/)
 assert.match(admin,/if\(!authorized\)/)
 assert.match(admin,/This account does not have teacher access/)
 assert.match(admin,/if\(error\)throw error/)
 assert.match(admin,/onRetry=\{stale \? refresh : null\}/)
 assert.match(shell,/onRetry=null/)
 assert.match(shell,/Retry connection/)
})

test('theme is applied before first render without restoring stale student theme on teacher exit',()=>{
 const main=rd('src/main.jsx'),app=rd('src/App.jsx')
 assert.match(main,/applySiteTheme\(rememberedTheme\(\)\)/)
 assert.ok(main.indexOf('applySiteTheme(rememberedTheme())')<main.indexOf('createRoot('))
 assert.match(app,/if \(!admin && st\?\.theme\) applySiteTheme\(st\.theme\)/)
 assert.doesNotMatch(app,/\[admin, st\?\.theme\]/)
})

test('the teacher dashboard is code-split and not loaded into the student entry bundle',()=>{
 const app=rd('src/App.jsx')
 assert.match(app,/\blazy, Suspense\b/)
 assert.match(app,/const Admin = lazy\(\(\) => import\('\.\/Admin\.jsx'\)\)/)
 assert.match(app,/if \(admin\) return <Suspense fallback=\{<StatusScreen /)
 assert.match(app,/<Admin \/><\/Suspense>/)
 assert.doesNotMatch(app,/import Admin from '\.\/Admin\.jsx'/)
})

test('all loading screens use local seasonal palettes, not the legacy blue shell',()=>{
 const css=rd('src/styles/app-completion.css')
 const status=rd('src/components/StatusScreen.jsx')
 const teacher=rd('src/teacher/Shell.jsx')
 for(const theme of THEME_IDS){
  assert.ok(css.includes('.site-status[data-theme="'+theme+'"]{'),'missing loading palette for '+theme)
  assert.ok(css.includes('.teacher-auth[data-theme="'+theme+'"]'),'missing teacher palette for '+theme)
 }
 for(const target of ['--loading-bg','--loading-surface','--loading-ink','--loading-accent','--loading-muted','.site-status-progress','@keyframes site-progress','.teacher-auth-layout-loading','.teacher-loading-emblem']){
  assert.ok(css.includes(target),'missing loading feature '+target)
 }
 assert.match(status,/className="site-status-header"/)
 assert.match(status,/className="site-status-progress"/)
 assert.match(status,/name=\{loading \? 'sparkle' : 'alert'\}/)
 assert.match(teacher,/loading\?" teacher-auth-layout-loading":""/)
 assert.match(teacher,/className="teacher-loading-emblem"/)
 assert.doesNotMatch(teacher,/className="spin"/)
})
test('all desktop sidebar controls and version label fit inside scroll-safe rails',()=>{
 const css=rd('src/styles/app-completion.css')
 const student=rd('src/student/Shell.jsx'),teacher=rd('src/teacher/Shell.jsx')
 for(const marker of ['.app.wide>.rail','.tapp.wide>.trail','.app.wide .rail-dock','.tapp.wide .trail-dock','.trail-version .vtag-name','max-height:calc(100dvh - 24px)','overflow-y:auto!important','@media(min-width:1000px) and (max-height:740px)']){
  assert.ok(css.includes(marker),'missing sidebar fit rule: '+marker)
 }
 assert.match(student,/className="rail-tools"/)
 assert.match(student,/className="rail-teacher"/)
 assert.match(teacher,/className="trail-tools"/)
 assert.match(teacher,/className="trail-version"/)
 assert.match(teacher,/aria-label="Sign out"/)
 assert.match(teacher,/aria-label="Student page"/)
})
