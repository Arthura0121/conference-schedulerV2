import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path'
import {CHANGELOG,latestRelease} from '../../src/changelog.js'
const root=new URL('../../',import.meta.url),rd=p=>fs.readFileSync(new URL(p,root),'utf8'),pkg=JSON.parse(rd('package.json'))
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])
const srcFiles=walk(new URL('src',root).pathname).filter(f=>/\.jsx?$/.test(f))
test('version comes from package.json at build time (vite define), one source of truth',()=>{const v=rd('vite.config.js');assert.match(v,/readFileSync\(new URL\('\.\/package\.json'/);assert.match(v,/__APP_VERSION__:JSON\.stringify\(pkg\.version\)/);assert.match(v,/__BUILD_ID__/)})
test('only src/version.js knows the version; no hard-coded semver string anywhere else in src (except dated changelog entries)',()=>{
  for(const f of srcFiles){const t=fs.readFileSync(f,'utf8'),base=path.basename(f);if(base==='changelog.js')continue;const hits=t.match(/['"`>\s]v?\d+\.\d+\.\d+(?!\d)/g)||[];const real=hits.filter(h=>!/0\.0\.0-dev/.test(h)&&!/\b(?:1\.0\.0|0\.0\.0)\b/.test(h));assert.deepEqual(real,[],f+' hard-codes a version')}
  assert.match(rd('src/version.js'),/__APP_VERSION__/)})
test('student and teacher interfaces use the SAME module (VersionTag/AboutConference -> version.js)',()=>{
  const app=rd('src/App.jsx'),shell=rd('src/teacher/Shell.jsx'),set=rd('src/teacher/SettingsView.jsx'),about=rd('src/components/About.jsx')
  assert.match(app,/VersionTag/);assert.match(shell,/VersionTag/);assert.match(set,/AboutConference/);assert.match(about,/from '\.\.\/version\.js'/);for(const f of ['src/App.jsx','src/teacher/Shell.jsx','src/teacher/SettingsView.jsx'])assert.doesNotMatch(rd(f),/APP_VERSION\s*=|version\s*[:=]\s*['"]/)
  assert.match(rd('src/Admin.jsx'),/WhatsNew/)})
test('package.json version matches the first changelog entry and CHANGELOG.md heading',()=>{assert.equal(pkg.version,'4.0.0');assert.equal(latestRelease().version,pkg.version);assert.match(rd('CHANGELOG.md'),new RegExp('^## '+pkg.version.replace(/\./g,'\\.'),'m'))
  for(const r of CHANGELOG){assert.match(r.version,/^\d+\.\d+\.\d+$/);assert.ok(r.items.length>0)};const vs=CHANGELOG.map(r=>r.version);assert.deepEqual(vs,[...vs].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})),'newest first')})
test("What's New only claims what exists in the code (feature claims are checked against the 2.4.0 release that introduced them)",()=>{assert.equal(latestRelease().version,'4.0.0');assert.ok(latestRelease().items.length>0);const txt=CHANGELOG.find(r=>r.version==='2.4.0').items.join(' ');
  assert.match(txt,/Realtime/);assert.ok(fs.existsSync(new URL('src/realtime.js',root)));assert.match(txt,/[Bb]ulk/);assert.ok(fs.existsSync(new URL('src/teacher/BulkDialog.jsx',root)));assert.match(txt,/roster/);assert.ok(fs.existsSync(new URL('src/student/Roster.jsx',root)));assert.match(txt,/timeline/);assert.ok(fs.existsSync(new URL('src/activity.js',root)))
  assert.match(txt,/off by default/i);assert.match(txt,/fallback/i)})
test('About panel and What\'s New contain no secrets, URLs, keys or deployment configuration',()=>{const t=rd('src/components/About.jsx')+rd('src/changelog.js')+rd('src/version.js');assert.doesNotMatch(t,/VITE_|import\.meta\.env|supabase\.co|https?:\/\/|eyJ|service_role|anon/i)
  const v=rd('vite.config.js');assert.doesNotMatch(v,/define:\{[^}]*(SUPABASE|KEY|SECRET)/i);assert.match(v,/GITHUB_SHA/)})
test('check-bundle verifies the freshly built production bundle carries the package.json version',()=>{const c=rd('scripts/check-bundle.mjs');assert.match(c,/package\.json/);assert.match(c,/js\.includes\(pkg\.version\)/);assert.match(c,/FAIL bundle does not contain package\.json version/);assert.match(c,/process\.exit\(bad\?1:0\)/)})

test('major redesign release label is consistently branded and lockfile agrees',()=>{
 const lock=JSON.parse(rd('package-lock.json'))
 assert.equal(pkg.version,'4.0.0')
 assert.equal(lock.version,pkg.version)
 assert.equal(lock.packages[''].version,pkg.version)
 assert.match(rd('src/version.js'),/English Conferences v\$\{APP_VERSION\}/)
 const about=rd('src/components/About.jsx')
 assert.match(about,/className="vtag-name">English Conferences/)
 assert.match(about,/<h3>v\{r.version\} · \{r.title\}<\/h3>/)
 assert.doesNotMatch(about,/Aurora After Dark|Aurora v|AboutAurora/)
 const settings=rd('src/teacher/SettingsView.jsx')
 assert.match(settings,/AboutConference/)
 assert.match(rd('CHANGELOG.md'),/^## 4\.0\.0 /m)
})

test('v4 release version stays visible on desktop and compact teacher views',()=>{
 const teacher=rd('src/teacher/Shell.jsx'),css=rd('src/styles/app-completion.css')
 const student=rd('src/App.jsx')
 assert.match(teacher,/<VersionTag className="mobile-release" \/>/)
 assert.match(teacher,/className="trail-version"/)
 assert.match(student,/<VersionTag \/>/)
 assert.match(css,/\.ttop-center \.mobile-release/)
 assert.match(css,/\.ttop-center \.mobile-release \.vtag-name/)
})
