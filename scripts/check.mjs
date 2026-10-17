// Static checks that need no database and no network. Run: npm run check
import {findUnqualifiedDml} from './sqllint.mjs'
import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module'
const require=createRequire(import.meta.url); const root=path.resolve(import.meta.dirname,'..')
let fails=0,skips=0; const pass=(n)=>console.log('PASS',n),fail=(n,d='')=>{fails++;console.log('FAIL',n,d)},skip=(n)=>{skips++;console.log('SKIPPED',n)}
const rd=p=>fs.readFileSync(path.join(root,p),'utf8')
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>['node_modules','dist','.git'].includes(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])
const srcOf=d=>walk(path.join(root,d)).filter(f=>/\.jsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n')
const allCss=[rd('src/style.css'),...walk(path.join(root,'src/styles')).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(f,'utf8'))].join('\n')
const sql=rd('supabase/migrations/001_schema.sql')
// All migrations in order (001, 002, 003, ...): later definitions of a function replace earlier ones, exactly as the database will see them.
const migFiles=fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>/^\d+_.*\.sql$/.test(f)).sort(),sqlAll=migFiles.map(f=>rd('supabase/migrations/'+f)).join('\n')
// 1 every table has RLS and no grants to anon
for(const m of sql.matchAll(/create table (\w+)/g)) (new RegExp(`enable row level security`).test(sql)&&new RegExp(`alter table[^;]*\\b${m[1]}\\b[^;]*enable row level security|alter table ${m[1]} enable row level security`).test(sql))?pass('RLS enabled: '+m[1]):fail('RLS missing: '+m[1])
!/grant[^;]*to[^;]*\banon\b/i.test(sql)?pass('no grants to anon'):fail('grant to anon found')
!/create policy/i.test(sql)?pass('no RLS policies on application tables (function-only access)'):fail('unexpected policy')
// every policy anywhere may exist ONLY on realtime.messages, only for SELECT (receive). No insert/update/delete/all policy => browsers cannot send or forge signals.
{const pols=[...sqlAll.matchAll(/create policy\s+(\w+)\s+on\s+([\w.]+)\s+for\s+(\w+)/gi)];pols.every(m=>m[2]==='realtime.messages'&&m[3].toLowerCase()==='select')?pass('RLS policies exist only on realtime.messages and only FOR SELECT ('+pols.length+')'):fail('unexpected policy shape',pols.map(m=>m.slice(1).join(' ')).join('; '))}
// 2 functions
const fns=[...sqlAll.matchAll(/create function (\w+)\(([\s\S]*?)\) returns [\s\S]*?\$\$([\s\S]*?)\$\$;/g)]
;(sqlAll.match(/\$\$/g)||[]).length%2===0?pass('balanced $$ quoting'):fail('unbalanced $$')
for(const [,n,,b] of fns) if(n.startsWith('admin_')&&n!=='admin_check') b.includes('require_admin()')?pass('server-side admin check: '+n):fail('missing require_admin: '+n)
for(const [,n,,b] of fns) if(/security definer/.test(sqlAll.slice(sqlAll.lastIndexOf('create function '+n),sqlAll.lastIndexOf('create function '+n)+800))&&!/set search_path/.test(sqlAll.slice(sqlAll.lastIndexOf('create function '+n),sqlAll.lastIndexOf('create function '+n)+800)))fail('search_path unset: '+n)
const names=new Set(fns.map(f=>f[1])),helpers=new Set(['require_admin','log_event','is_locked','touch_edit_lock','log_event2','rt_notify','rt_trg_changed','rt_trg_events','bulk_classify','rt_is_admin'])
const used=new Set(walk(path.join(root,'src')).flatMap(f=>[...fs.readFileSync(f,'utf8').matchAll(/(?:call|rpc)\(\s*'(\w+)'/g)].map(m=>m[1])))
for(const u of used) names.has(u)&&!helpers.has(u)?pass('frontend RPC exists: '+u):fail('frontend calls unknown/internal function: '+u)

// 2b. frontend call parameters must match SQL signatures exactly (PostgREST needs every parameter, by name)
const sig={};for(const [,n,args] of fns)sig[n]=[...args.matchAll(/\b(p_\w+)\s+[a-z]/g)].map(m=>m[1]).sort().join(',')
for(const f of walk(path.join(root,'src')).filter(f=>/\.jsx?$/.test(f))){const src=fs.readFileSync(f,'utf8')
 for(const m of src.matchAll(/\b(?:call|run|edit)\(\s*'(\w+)'/g)){const n=m[1];if(!(n in sig))continue
  let i=m.index+m[0].length,depth=1;while(i<src.length&&depth>0){const c=src[i++];if(c==='(')depth++;else if(c===')')depth--}
  const got=[...new Set([...src.slice(m.index,i).matchAll(/\b(p_\w+)\s*:/g)].map(x=>x[1]))].sort().join(',')
  got===sig[n]?pass(`params match: ${n}(${sig[n]})`):fail(`param mismatch ${n}`,`frontend [${got}] vs sql [${sig[n]}]`)}}
// 2c. structural lint of every SQL function body (NOT an execution of the SQL)
for(const [,n,,b0] of fns){const b=b0.replace(/--.*$/gm,'').replace(/'(?:[^']|'')*'/g,"''")
 const ifs=(b.match(/\bif\b/g)||[]).length,endifs=(b.match(/\bend if\b/g)||[]).length
 const opens=(b.match(/\bbegin\b/g)||[]).length+(b.match(/\bcase\b/g)||[]).length,ends=(b.match(/\bend\b(?! (?:if|loop)\b)/g)||[]).length
 const par=(b.match(/\(/g)||[]).length-(b.match(/\)/g)||[]).length
 ifs===2*endifs&&opens===ends&&par===0?pass('SQL structure balanced: '+n):fail('SQL structure unbalanced: '+n,`if/end if ${ifs}/${endifs}, begin+case/end ${opens}/${ends}, parens ${par}`)}
// 2d. DB-test lint: never mix a data-changing backend call and a direct table read in ONE expression (PostgreSQL snapshot rule). Checked per statement.
{const lines=rd('supabase/tests/db_tests.sql').split('\n');let bad2=0
 lines.forEach((l,i)=>{const s=l.replace(/'(?:[^']|'')*'/g,"''");for(const st of s.split(';')){if(!st.includes('pg_temp.ok('))continue
  if(/\b(as_user|val|anon)\(/.test(st)&&(/\(select\b/.test(st)||/is_locked\(\)/.test(st))){bad2++;fail('db_tests.sql line '+(i+1)+' mixes a call and a read in one expression')}}})
 if(!bad2)pass('db_tests.sql: no assertion mixes a data-changing call with a read of its result')}
// 2e. db_tests.sql MECHANISM check (structure and ordering, not just text). Static analysis only: PostgreSQL has not executed this file.
{const f=rd('supabase/tests/db_tests.sql'),T='db_tests.sql: '
 const strip=s=>s.replace(/'(?:[^']|'')*'/g,"''"),bodies=[]
 const skel=f.replace(/--.*$/gm,'').replace(/\$\$([\s\S]*?)\$\$/g,(m,b)=>{bodies.push(b);return '$$'+(bodies.length-1)+'$$'})
 const stmts=skel.split(';').map(s=>s.trim()).filter(Boolean),rest=skel.slice(skel.lastIndexOf(';')+1).trim()
 const chk=(ok,msg,det='')=>ok?pass(T+msg):fail(T+msg,det)
 // (a) no transaction control anywhere: a later ROLLBACK would also undo objects this script created (v2.1.2 bug)
 chk(!stmts.some(s=>/^(begin|commit|rollback|abort|end|start\s+transaction|savepoint|release)\b/i.test(s)),'no top-level BEGIN/COMMIT/ROLLBACK/SAVEPOINT')
 chk(!bodies.some(b=>/\b(commit|rollback|savepoint)\b/i.test(strip(b))),'no COMMIT/ROLLBACK/SAVEPOINT inside any function body')
 // (b) last statement is the result SELECT, with nothing after it (editor shows only the last statement)
 chk(/^select \* from pg_temp\.run_db_tests\(\)$/i.test(stmts.at(-1))&&rest==='','last statement is "select * from pg_temp.run_db_tests()" and nothing follows')
 // (c) the counter exists before the function that uses it, as top-level statements (not inside the rolled-back region)
 const iDrop=stmts.findIndex(s=>/^drop sequence if exists pg_temp\.test_pass_counter$/i.test(s)),iSeq=stmts.findIndex(s=>/^create temp sequence test_pass_counter$/i.test(s)),iRun=stmts.findIndex(s=>/^create or replace function pg_temp\.run_db_tests\(/i.test(s))
 chk(iDrop>=0&&iSeq>iDrop&&iRun>iSeq,'counter sequence is created at top level, before run_db_tests()')
 chk(!/setval\(/i.test(f),'counter is never reset mid-run')
 const okStmt=(stmts.find(s=>/^create (or replace )?function pg_temp\.ok\(/i.test(s))||'').replace(/\$\$(\d+)\$\$/,(m,i)=>bodies[+i])   // expand the $$n$$ placeholder back into the real body
 chk(/raise exception 'FAILED/.test(okStmt)&&/nextval\('pg_temp\.test_pass_counter'\)/.test(okStmt)&&okStmt.indexOf('raise exception')<okStmt.indexOf('nextval'),'ok() raises on failure, and counts only after the check passed')
 // (d) inside run_db_tests(): region ordering
 const run=iRun>=0?bodies[+stmts[iRun].match(/\$\$(\d+)\$\$/)[1]]:'',pos=r=>{const m=r.exec(run);return m?m.index:-1}
 const begins=[...run.matchAll(/^\s*begin\b/gm)].map(m=>m.index),innerBegin=begins[1]??-1
 const handler=pos(/exception\s+when\s+sqlstate\s+'U0001'\s+then\s+null/),sentinel=pos(/raise\s+exception\s+'[^']*'\s+using\s+errcode\s*=\s*'U0001'/)
 const innerEnd=handler>=0?run.indexOf('end;',handler):-1,seqRead=pos(/from\s+pg_temp\.test_pass_counter/),leftover=pos(/select\s+\(select count\(\*\) from slots/),ret=pos(/return\s+query/),before=pos(/before_cfg\s*$|select to_jsonb\(s\) into before_cfg/)
 chk(begins.length===2,'run_db_tests has exactly one outer and one inner (savepoint) BEGIN block',`found ${begins.length}`)
 chk(innerBegin>0&&sentinel>innerBegin&&handler>sentinel&&innerEnd>handler,'inner block order: BEGIN < deliberate U0001 raise < U0001 handler < END')
 chk(!/exception\s+when\s+others/i.test(run)&&(run.match(/exception\s+when/gi)||[]).length===1,'only the deliberate U0001 exception is caught in run_db_tests (a FAILED: error cannot be swallowed)')
 const oks=[...run.matchAll(/pg_temp\.ok\(/g)].map(m=>m.index),dml=[...strip(run).matchAll(/\b(insert\s+into|update\s+\w+\s+set|delete\s+from)\b/gi)].map(m=>m.index)
 // positions in strip(run) differ from run; recompute DML against raw positions using a masked copy of equal length
 const mask=run.replace(/'(?:[^']|'')*'/g,m=>"'"+' '.repeat(m.length-2)+"'"),dml2=[...mask.matchAll(/\b(insert\s+into|update\s+\w+\s+set|delete\s+from)\b/gi)].map(m=>m.index)
 chk(oks.length>0&&oks.every(i=>i>innerBegin&&i<sentinel),'every assertion call is inside the rolled-back region')
 chk(dml2.length>0&&dml2.every(i=>i>innerBegin&&i<sentinel),'every INSERT/UPDATE/DELETE in the function is inside the rolled-back region (so all of it is undone)',`outside: ${dml2.filter(i=>!(i>innerBegin&&i<sentinel)).length}`)
 const guard=pos(/REFUSING TO RUN/);chk(guard>before&&guard<innerBegin&&/exists\(select 1 from bookings\)/.test(run.slice(before,innerBegin)),'refuses to run (before touching anything) if the project already has bookings/holds/drafts')
 chk(before>=0&&before<innerBegin&&seqRead>innerEnd&&leftover>seqRead&&ret>leftover,'settings snapshot is taken before the region; counter and cleanup checks are read after it; result returned last')
 // (e) result logic: gating number must equal the count derived from the file
 const sites=(f.match(/pg_temp\.ok\(/g)||[]).length-1,L=f.split('\n'),a0=L.findIndex(l=>/foreach t in array/.test(l)),b0=L.findIndex((l,i)=>i>a0&&/end loop;/.test(l)),inLoop=(L.slice(a0,b0).join('\n').match(/pg_temp\.ok\(/g)||[]).length,iters=(L[a0].match(/'\w+'/g)||[]).length,expected=sites-inLoop+inLoop*iters
 const n1=run.match(/npass\s*<>\s*(\d+)/),n2=run.match(/npass\s*,\s*(\d+)\s*,\s*leftover/)
 chk(n1&&n2&&+n1[1]===expected&&+n2[1]===expected,`expected assertion count ${expected} matches the file (${sites} call sites, ${inLoop} of them in a loop run ${iters} times)`,`sql says ${n1&&n1[1]}/${n2&&n2[1]}`)
 chk(/leftover\s*<>\s*0/.test(run)&&/restored is not true/.test(run)&&/ALL DB TESTS PASSED/.test(run)&&run.indexOf('leftover<>0')<run.indexOf('ALL DB TESTS PASSED'),'"ALL DB TESTS PASSED" is only reachable when count is right, no rows remain and settings are restored')
 chk(rd('SETUP.md').includes(`${expected} assertions`),'SETUP.md quotes the same count')}
// 2f. live-update wiring (the "stale teacher dashboard" bug): both pages poll through startPolling and return its cleanup
{const A=rd('src/Admin.jsx'),S=rd('src/App.jsx'),T='live updates: '
 ;/startRealtime\(\{client:sb,topic:TOPIC_ADMIN,refresh:\(\)=>rf\.current\(\)[^;]*\);lv\.current=h;return\(\)=>\{h\.stop\(\)/.test(A)&&/fallbackMs:ADMIN_POLL_MS/.test(A)?pass(T+'teacher page opens the private admin channel, keeps polling as fallback, and returns stop() as cleanup'):fail(T+'teacher realtime wiring missing')
 ;/startRealtime\(\{client:sb,topic:TOPIC_PUBLIC,refresh:load[^;]*\);lv\.current=h;return\(\)=>\{h\.stop\(\)/.test(S)&&/if\(admin\|\|!configured\)return/.test(S)&&/fallbackMs:STUDENT_POLL_MS/.test(S)?pass(T+'student page opens the public channel (not behind the teacher page), keeps polling as fallback, and returns stop() as cleanup'):fail(T+'student realtime wiring missing')
 ;!/startPolling\(/.test(A+S)?pass(T+'pages no longer use polling as the primary mechanism (realtime.js owns the fallback timer)'):fail(T+'startPolling still used by a page')
 ;!/catch\s*\{\s*setOk\(false\)\s*\}/.test(A)?pass(T+'a failed fetch no longer logs the teacher out'):fail(T+'catch{setOk(false)} still present')
 ;/await refresh\(\)\}/.test(A)&&(A.match(/isLatest\(id\)/g)||[]).length>=3?pass(T+'teacher actions refetch afterwards; stale responses are ignored'):fail(T+'refetch-after-action or stale-response guard missing')
 ;/isAuthError\(e\)\)setOk\(false\);else setStale\(/.test(A)?pass(T+'only an auth error (not a network error) sends the teacher to sign-in'):fail(T+'catch block can log the teacher out on a network error')
 ;/formKey\(cfg\)/.test(A)&&!/\},\[cfg\]\)/.test(A)?pass(T+'settings form synced by field key, not by object identity'):fail(T+'form would be overwritten on every poll')
 const all=[...walk(path.join(root,'src'))].filter(f=>/\.jsx?$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n')
 ;(!/\.channel\(/.test(all)||/removeChannel/.test(all))?pass(T+'every Realtime channel has removeChannel cleanup'):fail(T+'.channel( without removeChannel')
 ;/private:\s*true/.test(rd('src/realtime.js'))&&!/\.send\(|\.httpSend|postgres_changes/.test(rd('src/realtime.js'))?pass(T+'channels are private, the browser never sends on them, and no postgres_changes (no table exposure)'):fail(T+'realtime.js must use private channels and never send')
 ;!/supabase_realtime|create policy|alter publication/i.test(sqlAll.replace(/create policy\s+\w+\s+on\s+realtime\.messages\s+for\s+select[\s\S]*?;/gi,''))?pass(T+'tables are not published to Realtime and have no policies; only broadcast signal policies exist'):fail(T+'schema exposes tables to Realtime')}
// 2g. UPDATE/DELETE without WHERE (Supabase's API roles reject them: error 21000 "UPDATE requires a WHERE clause"). Fixture of the old bug is excluded on purpose.
{const sqlFiles=walk(path.join(root,'supabase')).filter(f=>f.endsWith('.sql'));let bad3=0
 for(const f of sqlFiles){const r=findUnqualifiedDml(fs.readFileSync(f,'utf8'));if(r.length){bad3++;fail('SQL: UPDATE/DELETE without WHERE in '+path.relative(root,f),r.map(x=>'line '+x.line+': '+x.text).join(' | '))}}
 if(!bad3)pass(`SQL: no UPDATE/DELETE without WHERE in any of ${sqlFiles.length} SQL files`)
 for(const f of ['supabase/migrations/002_fix_unqualified_updates.sql','supabase/tests/verify_functions.sql','tests/fixtures/v2.1.5_unqualified_updates.sql'])fs.existsSync(path.join(root,f))?pass('exists '+f):fail('missing '+f)
 const fx=findUnqualifiedDml(rd('tests/fixtures/v2.1.5_unqualified_updates.sql')).length;fx===3?pass('SQL linter still detects the 3 original v2.1.5 bugs in its fixture (the linter itself works)'):fail('SQL linter no longer detects the fixture bugs',String(fx))
 const S=rd('SETUP.md');/002_fix_unqualified_updates/.test(S)&&/verify_functions/.test(S)?pass('SETUP.md documents applying 002 and verify_functions.sql'):fail('SETUP.md does not document the 002 migration')}
// 2h. AURORA design system + sound rules (static)
{const css=rd('src/style.css'),A=rd('src/App.jsx'),AD=rd('src/Admin.jsx'),TG=rd('src/student/SoundToggle.jsx'),S=rd('src/sound.js'),T='aurora: '
 for(const v of ['--aurora-midnight:#040B16','--aurora-blue:#237BD7','--aurora-electric:#53B7FF','--aurora-ice:#9FE7FF','--aurora-teal:#36D6C3','--aurora-seaglass:#78F0D2','--rose:#FB7185','--amber:#FBBF24','--text:#EAF7FF','--muted:#AFC8DB'])css.includes(v)?pass(T+'design token '+v.split(':')[0]):fail(T+'missing token '+v)
 ;/prefers-reduced-motion:\s*reduce[\s\S]*animation:none/.test(css)?pass(T+'reduced-motion turns animations and transitions off'):fail(T+'no reduced-motion rule')
 ;!/https?:\/\/|@import|@font-face|url\(/i.test(allCss)?pass(T+'CSS loads nothing from the network (no remote fonts or images) in ANY stylesheet'):fail(T+'CSS references a remote or external resource')
 ;/:focus-visible/.test(css)?pass(T+'visible keyboard focus style exists'):fail(T+'no :focus-visible style')
 ;/min-height:44px/.test(css)?pass(T+'buttons meet the 44px touch target'):fail(T+'buttons below 44px')
 ;/const load=useCallback\(async\(\)=>\{[\s\S]*?\},\[\]\)/.exec(A)&&!/sound\./.test(/const load=useCallback\(async\(\)=>\{[\s\S]*?\},\[\]\)/.exec(A)[0])?pass(T+'the polling/load function never plays sound'):fail(T+'sound referenced inside load()')
 ;!/sound\./.test(rd('src/poll.js')+rd('src/adminData.js')+rd('src/realtime.js'))?pass(T+'background polling/realtime/data helpers never play sound'):fail(T+'background data code can play sound')
 ;/sound\.play\('success'\)/.test(AD)&&/sound\.play\('error'\)/.test(AD)?pass(T+'teacher action sounds are limited to explicit action feedback'):fail(T+'teacher action feedback sounds missing')
 ;!/new (webkit)?AudioContext/.test(S.replace(/AudioCtor/g,''))&&/ctx\?\?=new AudioCtor\(\)/.test(S)?pass(T+'audio context is created lazily inside play(), never at load'):fail(T+'audio context created eagerly')
 ;!/fetch\(|XMLHttpRequest|supabase|\.rpc\(/.test(S)?pass(T+'sound code sends nothing anywhere'):fail(T+'sound.js touches the network')
 ;/aria-pressed=\{on\}/.test(TG)&&/aria-label=\{on \?|aria-label=\{on\?/.test(TG)?pass(T+'sound toggle is an accessible pressed-state button'):fail(T+'sound toggle not accessible')
 ;/useState\(sound\.isOn\(\)\)/.test(TG)?pass(T+'toggle initial state comes from the saved preference (default on unless muted)'):fail(T+'toggle state wrong')}

// 2i. v2.3.0 rules (static)
{const T='v2.3.0: ',all=srcOf('src'),teacher=srcOf('src/teacher')+rd('src/Admin.jsx')
 ;!/\bwindow\.(confirm|prompt|alert)\b|\b(confirm|prompt|alert)\(\s*['"`]/.test(all.replace(/useConfirm\(\)|=\s*useConfirm/g,''))?pass(T+'no window.confirm/prompt/alert: destructive actions use the in-page confirmation dialog'):fail(T+'a browser confirm/prompt/alert is still used')
 ;!/\buse\(|useActionState|useOptimistic|useFormStatus|<Activity[\s>/]|useEffectEvent|react-dom\/server/.test(all)?pass(T+'no React 19-only APIs in src (the app must run on React 18)'):fail(T+'React 19-only API found')
 ;(teacher.match(/admin_set_available/g)||[]).length>=2&&!/startPolling|refresh\(\)\s*;?\s*run\(/.test(rd('src/teacher/SlotEditor.jsx'))?pass(T+'availability is changed only by explicit teacher buttons in the slot editor (never by polling or by Save)'):fail(T+'availability change wiring unexpected')
 ;/p_avail:\s*true/.test(rd('src/teacher/SlotEditor.jsx'))&&/disabled=\{c\.past\}/.test(rd('src/teacher/SlotEditor.jsx'))?pass(T+'opening a slot requires confirmation and is disabled for past slots'):fail(T+'open-slot guard missing')
 ;!/p_avail/.test(rd('src/teacher/SlotEditor.jsx').split('const save = async')[1].split('const open =')[0])?pass(T+'Save (admin_upsert_slot) never sends an availability value'):fail(T+'Save sends availability')
 ;/\.sheet|dialog/.test(allCss)&&/showModal/.test(rd('src/components/ui.jsx'))?pass(T+'sheets are native modal dialogs (focus trap, Escape, focus return)'):fail(T+'sheet is not a native dialog')
 ;/env\(safe-area-inset-bottom/.test(allCss)&&/viewport-fit=cover/.test(rd('index.html'))?pass(T+'safe-area insets are used and the viewport covers the notch'):fail(T+'safe-area support missing')}
// 3 secrets
const bad=[];for(const f of walk(root)){if(/\.(zip|png|jpg|ico)$/.test(f)||f.endsWith('check.mjs')||f.endsWith('package-lock.json'))continue;const t=fs.readFileSync(f,'utf8');if(/service_role['"` ]*[:=]|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/.test(t))bad.push(f)}
bad.length?fail('secret-like strings',bad.join(',')):pass('no keys/JWTs in source')
fs.existsSync(path.join(root,'.env'))?fail('.env present (must not be shipped)'):pass('no .env file shipped')
;/YOUR-/.test(rd('.env.example'))?pass('.env.example has placeholders only'):fail('.env.example not placeholder')
const seed=rd('supabase/seed.sql');/[A-Z][a-z]+ [A-Z][a-z]+ *'/.test(seed.replace(/Taken on paper sign-up sheet|Not available|America\/New_York/g,''))?fail('seed may contain names'):pass('seed contains no student names')
// 4 JSX/JS syntax
let tx=null;try{const e=require('esbuild');tx=(c,f)=>e.transformSync(c,{loader:f.endsWith('x')?'jsx':'js'})}catch{try{const ts=require('typescript');tx=(c)=>{const r=ts.transpileModule(c,{reportDiagnostics:true,compilerOptions:{jsx:'react-jsx',target:'es2022',module:'esnext'}});if(r.diagnostics.length)throw new Error(r.diagnostics[0].messageText)}}catch{}}
for(const f of walk(path.join(root,'src')).filter(f=>/\.jsx?$/.test(f))){if(!tx){skip('syntax '+f);continue};try{tx(fs.readFileSync(f,'utf8'),f);pass('syntax '+path.relative(root,f))}catch(e){fail('syntax '+f,String(e.message).split('\n')[0])}}
for(const f of ['package.json','.github/workflows/deploy.yml','vite.config.js','index.html'])fs.existsSync(path.join(root,f))?pass('exists '+f):fail('missing '+f)
const pkg=JSON.parse(rd('package.json'));for(const s of Object.values(pkg.scripts).join(' ').matchAll(/node (\S+)/g))if(!/^--/.test(s[1])&&!fs.existsSync(path.join(root,s[1])))fail('script path missing '+s[1])
console.log(`\n${fails} failed, ${skips} skipped`);process.exit(fails?1:0)
