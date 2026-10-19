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
