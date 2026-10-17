// Static checks of the v2.4.2 SQL verification and test scripts. PostgreSQL has NOT executed any of these files: these tests only prove structure, safety rules and
// cross-file consistency (they cannot prove the SQL runs). See TESTING.md.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs'
const rd=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8')
const verify=rd('supabase/tests/verify_v240_READONLY.sql'),t240=rd('supabase/tests/db_tests_v240.sql'),legacy=rd('supabase/tests/db_tests.sql'),roll=rd('supabase/dev_only/rollback_003_REVIEW_FIRST.sql')
const mig=['001_schema','002_fix_unqualified_updates','003_v240_realtime_bulk_roster'].map(n=>rd('supabase/migrations/'+n+'.sql')).join('\n'),m3=rd('supabase/migrations/003_v240_realtime_bulk_roster.sql')
/** removes "-- ..." comments but NOT a "--" inside a single-quoted string (string-aware, unlike a plain regex) */
function noComments(s){let o='',i=0;while(i<s.length){const c=s[i];if(c==="'"){let j=i+1;while(j<s.length&&!(s[j]==="'"&&s[j+1]!=="'"))j+=s[j]==="'"?2:1;o+=s.slice(i,j+1);i=j+1}else if(c==='-'&&s[i+1]==='-'){while(i<s.length&&s[i]!=='\n')i++}else{o+=c;i++}}return o}
/** code with comments and single-quoted strings blanked out (what the PostgreSQL PARSER sees as identifiers/keywords). Dollar-quoted bodies are kept as code. */
const codeOnly=s=>noComments(s).replace(/'(?:[^']|'')*'/g,"''")
/** returns {parens, openQuote}: parentheses balance and whether a string literal is left open. */
function balance(s){let p=0,i=0,t=noComments(s);while(i<t.length){const c=t[i];if(c==="'"){i++;while(i<t.length&&!(t[i]==="'"&&t[i+1]!=="'")){i+=t[i]==="'"?2:1}if(i>=t.length)return{parens:p,openQuote:true};i++;continue}if(c==='(')p++;else if(c===')')p--;i++}return{parens:p,openQuote:false}}

test('verify_v240_READONLY (v2.4.2): ONE statement, no transaction control and no SET, no write or DDL word, no semicolon except the terminator',()=>{
  // Why: the script must not depend on HOW an editor submits it. One statement cannot be split, and a lone semicolon-free body cannot be cut by a client that splits on ";".
  const stmts=codeOnly(verify).split(';').map(x=>x.trim()).filter(Boolean)
  assert.equal(stmts.length,1,'exactly ONE statement');assert.match(stmts[0],/^with\b/i)
  assert.equal((verify.match(/;/g)||[]).length,1,'the only semicolon in the whole file (comments and strings included) is the terminator');assert.equal(verify.trimEnd().at(-1),';','the file ends with the terminator (nothing, not even a comment, follows it)')
  const c=codeOnly(verify);assert.doesNotMatch(c,/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|analyze|call|execute|do|set_config|nextval|setval|pg_sleep|pg_terminate|begin|commit|rollback|savepoint|abort|prepare|lock|listen|notify|reindex|cluster|refresh)\b/i)
  assert.doesNotMatch(c,/\bset\b/i,'no SET of any kind (v2.4.1 started with SET TRANSACTION READ ONLY, which only works inside a transaction block)')})
test('verify_v240_READONLY (v2.4.2): does not claim that SET TRANSACTION makes it safe; says what is and is not enforced; reports the transaction mode of the run',()=>{
  const head=verify.slice(0,verify.indexOf('\nwith\n'));assert.doesNotMatch(codeOnly(verify),/set transaction/i)
  assert.match(head,/does not claim|WHAT IT DOES NOT CLAIM/i);assert.match(head,/25P01/);assert.match(head,/only works inside a transaction block/);assert.match(head,/ONE statement/);assert.match(head,/psql/);assert.match(head,/NOT EXECUTED/)
  assert.match(verify,/'transaction mode of this run'/);assert.match(verify,/current_setting\('transaction_read_only'\)/)
  assert.doesNotMatch(head,/guarantee/i,'no guarantee wording')})
test('verify_v240_READONLY (v2.4.2): every data probe asks query_to_xml for the <table> document (tableforest=false), reads it with a path that matches it, and a missing value is a FAIL, never a "?"',()=>{
  const vc=noComments(verify),calls=[...vc.matchAll(/query_to_xml\('((?:[^']|'')*)',\s*([a-z]+)\s*,\s*([a-z]+)\s*,\s*''\)/g)];assert.equal(calls.length,4,'four probes, each a complete call')
  for(const [,,nulls,forest] of calls){assert.equal(nulls,'false');assert.equal(forest,'false','tableforest must be false: the v2.4.1 value (true) gave a bare <row>, an EMPTY value for zero rows and a multi-root fragment for several rows')}
  const xp=[...vc.matchAll(/xpath\('([^']+)'/g)].map(m=>m[1]);assert.equal(xp.length,4);for(const x of xp){assert.equal(x,'/table/row/c/text() | /row/c/text()')}
  assert.doesNotMatch(vc,/xpath\('\/row\/c\/text\(\)'/,'the bare v2.4.1 path must be gone');const probeAndG=vc.slice(vc.indexOf('raw as ('),vc.indexOf('fx(sig,kind,grp)'))+vc.slice(vc.indexOf("select 70,'G data (003)'"),vc.indexOf('tally as ('));assert.ok(probeAndG.length>1500,'the regions were found');assert.doesNotMatch(probeAndG,/'\?'/,'no silent "?" fallback in the probes or in section G');assert.doesNotMatch(vc,/coalesce\(\(xpath/,'v2.4.1 pattern coalesce((xpath(...)),\'?\') is gone');assert.doesNotMatch(vc,/\?&/,'no ?& operator (some clients treat ? as a parameter marker)')
  const g=vc.slice(vc.indexOf("select 70,'G data (003)'"),vc.indexOf('tally as ('));assert.ok(g.length>1000);assert.doesNotMatch(g,/xpath\(|query_to_xml\(/,'section G rows only read the probe CTE')
  assert.ok((vc.match(/COULD NOT READ/g)||[]).length>=4,'each of the four probes has an explicit could-not-read failure');for(const v of ['v_roster','v_marked','v_anon','v_keys'])assert.match(vc,new RegExp("when p\\."+v+"[^\\n]*else 'FAIL' end"),v+': the status falls through to FAIL when the probe has no value')
  // each probe query runs once (4 calls in total, none in the res rows) and only when the catalog says 003 is fully installed
  for(const m of vc.matchAll(/query_to_xml\(/g))assert.match(vc.slice(Math.max(0,m.index-45),m.index),/case when s\.st='full' then\s*$/,'query_to_xml only inside the installed-state guard')})
test('verify_v240_READONLY: never names a 003-only column in parsed SQL (the v2.4.0 bug): such names may appear only inside string literals or query_to_xml text',()=>{
  const c=codeOnly(verify);for(const w of ['public_roster','show_name','name_hidden','roster_consent','roster_visible','public_visible','meta'])assert.doesNotMatch(c,new RegExp('\\b'+w+'\\b'),w+' appears in parsed SQL')
  for(const w of ['public_roster','show_name','name_hidden'])assert.ok(verify.includes(w),w+' is still checked (via catalog text / query_to_xml)')
  // every data read of a 003-only column goes through query_to_xml, which is only reached in CASE branches guarded by the catalog state
  const vc=noComments(verify);const q=[...vc.matchAll(/query_to_xml\('((?:[^']|'')*)'/g)].map(m=>m[1]);assert.ok(q.length>=4);for(const x of q)assert.match(x,/^select /i)
  })
test('verify_v240_READONLY: balanced, one result set, reports installation state and never reports success when 003 is absent or partial',()=>{
  const b=balance(verify);assert.equal(b.parens,0);assert.equal(b.openQuote,false)
  for(const w of ["'VERDICT'",'NOT INSTALLED','PARTIALLY INSTALLED','is NOT installed',"'SKIP'","'FAIL'","'PASS'","'WARN'","'INFO'"])assert.ok(verify.includes(w),w)
  const v=verify.slice(verify.indexOf('-- ---------- verdict'));assert.match(v,/when t\.nfail>0 then 'PROBLEM/);assert.match(v,/when s\.st='none' then 'BEFORE 003/);assert.match(v,/when s\.st='partial' then 'PROBLEM/)
  assert.ok(v.indexOf("when t.nfail>0")<v.indexOf("s.st='none'"),'a FAIL always wins over a "before 003" success message');assert.doesNotMatch(v.slice(0,v.indexOf("else 'AFTER 003")),/all .* passed/,'"all passed" only in the AFTER 003 branch')
  assert.match(verify,/case when s\.st='none' then 'SKIP'/);assert.match(verify,/state as \(/);assert.match(verify,/'full'/)})
test('verify_v240_READONLY expects exactly what the migrations create: functions, triggers, policies, columns (no drift between files)',()=>{
  const created=new Set([...mig.matchAll(/create (?:or replace )?function (\w+)\(/g)].map(m=>m[1]))
  const sigs=[...verify.matchAll(/\('([a-z_0-9]+)\(([^']*)\)','(browser|internal)','(base|before|after)'\)/g)];assert.ok(sigs.length>=40,'found '+sigs.length)
  for(const [,n] of sigs)assert.ok(created.has(n),'verify expects function '+n+' but no migration creates it')
  const after=sigs.filter(s=>s[4]==='after').map(s=>s[1]);for(const n of ['list_roster','admin_bulk_set_available','admin_activity','rt_is_admin','bulk_classify','log_event2','rt_notify'])assert.ok(after.includes(n),n)
  const markerFns=/proname in \(([^)]*)\)\) as fns/.exec(verify)[1].match(/'(\w+)'/g).map(x=>x.slice(1,-1));assert.equal(markerFns.length,12)
  for(const n of markerFns)assert.ok(new RegExp('create function '+n+'\\(').test(m3),'marker function '+n+' is created by 003')
  const trg=[...verify.matchAll(/\('(rt_\w+)','(\w+)',(\d+),'(new|old)'\)/g)];assert.equal(trg.length,13)
  for(const [,n,tbl,ev,tr] of trg){const e={4:'insert',8:'delete',16:'update'}[ev];assert.match(m3,new RegExp(`create trigger ${n}\\s+after ${e} on ${tbl}\\s+referencing ${tr} table as changed`),n)}
  for(const p of ['sched_public_receive','sched_admin_receive'])assert.ok(m3.includes('create policy '+p))
  for(const [,tbl,col] of verify.matchAll(/\('(settings|bookings|admin_events)','(\w+)','(?:boolean|jsonb)'/g))assert.match(m3,new RegExp(`alter table ${tbl}\\s+add column if not exists ${col}\\b`),tbl+'.'+col)
  const priv=/grant execute on function (.*?) to authenticated;/s.exec(m3)[1];for(const [,n,a,k,g] of sigs)if(g==='after'&&k==='browser'&&n!=='confirm_booking')assert.ok(priv.replace(/\s+/g,'').includes(n+'('),n+' is granted to authenticated by 003')})

test('db_tests_v240.sql: labelled disposable-database-only; refuses unless the database is empty and 003 is installed; never suggests conference-TEST',()=>{
  const head=t240.slice(0,t240.indexOf('drop sequence'));assert.match(head,/DISPOSABLE, EMPTY DATABASE ONLY/);assert.match(head,/DO NOT RUN ON conference-TEST/);assert.match(head,/before seed\.sql|BEFORE seed\.sql|Do NOT run seed\.sql/)
  assert.match(t240,/exists\(select 1 from slots\) or exists\(select 1 from bookings\) or exists\(select 1 from holds\)/);assert.match(t240,/REFUSING TO RUN/);assert.match(t240,/to_regprocedure\('public\.admin_bulk_set_available/)
  assert.doesNotMatch(t240,/run (this )?(it )?(in|on) conference-TEST(?! OR)/i)})
test('db_tests_v240.sql MECHANISM (same rules as db_tests.sql): no transaction control, everything undone by U0001, only the deliberate exception is caught, result gating',()=>{
  const bodies=[],skel=noComments(t240).replace(/\$\$([\s\S]*?)\$\$/g,(m,b)=>{bodies.push(b);return '$$'+(bodies.length-1)+'$$'}),stmts=skel.split(';').map(s=>s.trim()).filter(Boolean)
  assert.ok(!stmts.some(s=>/^(begin|commit|rollback|abort|end|start\s+transaction|savepoint|release)\b/i.test(s)),'no top-level transaction control');assert.ok(!bodies.some(b=>/\b(commit|rollback|savepoint)\b/i.test(codeOnly(b))),'none inside functions')
  assert.match(stmts.at(-1),/^select \* from pg_temp\.run_v240_tests\(\)$/);assert.match(t240.trim(),/select \* from pg_temp\.run_v240_tests\(\);$/)
  const run=bodies.find(b=>/REFUSING TO RUN/.test(b)),pos=r=>{const m=r.exec(run);return m?m.index:-1}
  const begins=[...run.matchAll(/^\s*begin\b/gm)].map(m=>m.index),inner=begins[1],sent=pos(/raise exception 'V240_DB_TESTS_FINISHED_ROLLING_BACK' using errcode='U0001'/),h=pos(/exception when sqlstate 'U0001' then null/)
  assert.equal(begins.length,2);assert.ok(inner>0&&sent>inner&&h>sent);assert.equal((run.match(/exception\s+when/gi)||[]).length,1,'only one exception handler');assert.doesNotMatch(run,/exception\s+when\s+others/i)
  const mask=run.replace(/'(?:[^']|'')*'/g,m=>"'"+' '.repeat(m.length-2)+"'"),dml=[...mask.matchAll(/\b(insert\s+into|update\s+\w+\s+set|delete\s+from)\b/gi)].map(m=>m.index);assert.ok(dml.length>5);assert.ok(dml.every(i=>i>inner&&i<sent),'every INSERT/UPDATE/DELETE is inside the rolled-back region')
  const oks=[...run.matchAll(/pg_temp\.ok\(/g)].map(m=>m.index);assert.ok(oks.every(i=>i>inner&&i<sent),'every assertion is inside the rolled-back region')
  const g=pos(/REFUSING TO RUN: this database already contains/);assert.ok(g>0&&g<inner,'the emptiness guard runs before anything is touched');assert.ok(pos(/before_cfg/)<g&&pos(/fp_before/)<g,'snapshots are taken before the region')
  assert.ok(pos(/from pg_temp\.test_pass_counter/)>h&&pos(/return query/)>h);assert.match(run,/leftover<>0 or restored is not true or unchanged is not true/);assert.match(run,/ALL V2\.4\.1 DB TESTS PASSED/)
  assert.ok(run.indexOf('leftover<>0')<run.indexOf('ALL V2.4.1 DB TESTS PASSED'))})
test('db_tests_v240.sql: the assertion count in the file equals the number of assertion call sites',()=>{const sites=(t240.match(/pg_temp\.ok\(/g)||[]).length-1,m=/expected int:=(\d+)/.exec(t240);assert.ok(m,'expected is a number');assert.equal(+m[1],sites);assert.ok(sites>=100)})
test('db_tests_v240.sql REGRESSION: every teacher call runs with TEACHER claims (the v2.4.0 file ran admin calls with a student identity and would have failed with "forbidden")',()=>{
  // direct (inline) role switches must be preceded by pg_temp.claims(...)
  const run=t240.slice(t240.indexOf('create or replace function pg_temp.run_v240_tests'));for(const m of run.matchAll(/^\s*set local role authenticated;/gm)){assert.match(run.slice(Math.max(0,m.index-120),m.index),/pg_temp\.claims\(A\)/,'inline role switch without teacher claims')}
  assert.ok(!/perform admin_/.test(run),'no bare "perform admin_..." under a leftover identity');assert.match(t240,/create or replace function pg_temp\.bulk\(/);assert.match(t240,/pg_temp\.claims\('11111111-1111-1111-1111-111111111111'\)/)
  // negative authorization tests must use a VALID uuid so that the error can only come from authorization ('x'::uuid fails the cast and passes vacuously)
  assert.doesNotMatch(t240,/''x''::uuid|'x'::uuid/);assert.match(t240,/admin_set_name_hidden\(array\[%L::uuid\],true\)',f1\)\)='forbidden'/);assert.match(t240,/'forbidden'/)})
test('db_tests_v240.sql lint: no assertion mixes a data-changing backend call with a read of its result in ONE expression (PostgreSQL snapshot rule)',()=>{
  const run=t240.slice(t240.indexOf('create or replace function pg_temp.run_v240_tests'));let bad=[]
  run.split('\n').forEach((l,i)=>{const s=l.replace(/'(?:[^']|'')*'/g,"''");for(const st of s.split(';')){if(!st.includes('pg_temp.ok('))continue;if(/\b(as_user|val|vals|anon|bulk)\(/.test(st)&&/\(select\b/.test(st))bad.push(i+1)}})
  assert.deepEqual(bad,[])})
test('db_tests_v240.sql covers the required areas',()=>{
  for(const w of ['teacher hide overrides consent','only the consenting student has a name','cannot read the bookings table','anon role cannot call list_roster','a student cannot forge a public signal','a dry run changed nothing','a paper slot is never opened','the booked slot was neither closed nor cancelled','NULL include-other flag is rejected','exactly ONE public slots signal','no signal contains a name','activity signals go to the teacher topic only','a student is denied the teacher topic','legacy booking','13 realtime triggers','withdrawing consent still works during Lockdown','nobody signed in'])assert.ok(t240.includes(w),w)})
test('db_tests.sql (legacy): the stray "where id=1" after an assertion is gone; header count matches the code; labelled throw-away TEST only',()=>{
  assert.doesNotMatch(legacy,/'student cannot edit settings'\)\s*where\s/);assert.match(legacy,/update settings set locked=true where id=1'\) like 'permission denied%'/);assert.match(legacy,/assertions_expected = 108/);assert.match(legacy,/NEVER on a project holding a real schedule/)
  for(const f of [verify,t240,legacy]){const b=balance(f);assert.equal(b.parens,0);assert.equal(b.openQuote,false)}})
test('rollback_003: refuses to run where 003 is not installed; restores the 001 shapes; data kept',()=>{assert.match(roll,/STOP: migration 003 is not installed here/);assert.ok(roll.indexOf('STOP: migration 003')<roll.indexOf('drop trigger'));assert.match(roll,/drop function if exists confirm_booking\(uuid,text,text,boolean\)/);assert.doesNotMatch(codeOnly(roll),/drop table|drop column|truncate|delete from (slots|bookings|settings|admins|admin_events)\b/i)})

// ---- v2.4.2: XML behaviour (libxml2 = the engine behind PostgreSQL xpath). The XML below is written by hand in the shapes the PostgreSQL manual documents for query_to_xml.
// PostgreSQL did NOT generate it. If xmllint is not installed these tests are skipped (and say so).
import {spawnSync} from 'node:child_process';import os from 'node:os';import path from 'node:path'
const hasXmllint=spawnSync('xmllint',['--version']).status!==null&&!spawnSync('xmllint',['--version']).error
const XSI='xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
const shapes={table1:`<table ${XSI}>\n\n<row>\n  <c>42</c>\n</row>\n\n</table>\n`,table0:`<table ${XSI}>\n\n</table>\n`,tableNull:`<table ${XSI}>\n\n<row>\n</row>\n\n</table>\n`,row1:`<row ${XSI}>\n  <c>42</c>\n</row>\n\n`,rows2:`<row ${XSI}>\n  <c>1</c>\n</row>\n\n<row ${XSI}>\n  <c>2</c>\n</row>\n\n`,empty:''}
const xp=(file,expr)=>{const r=spawnSync('xmllint',['--xpath',expr,file],{encoding:'utf8'});return{status:r.status,out:(r.stdout||'').trim(),err:(r.stderr||'').trim()}}
const dir=hasXmllint?fs.mkdtempSync(path.join(os.tmpdir(),'aurora-xml-')):null;const fileOf=n=>{const f=path.join(dir,n+'.xml');fs.writeFileSync(f,shapes[n]);return f}
const PATH=/xpath\('([^']+)'/.exec(verify)[1]
test('XML paths (libxml2): the path used by verify_v240_READONLY reads the value from the <table> shape AND the bare <row> shape, and finds nothing (-> a FAIL row) for zero rows or NULL',{skip:!hasXmllint&&'xmllint not installed'},()=>{
  assert.equal(PATH,'/table/row/c/text() | /row/c/text()')
  assert.equal(xp(fileOf('table1'),PATH).out,'42');assert.equal(xp(fileOf('row1'),PATH).out,'42')
  for(const n of ['table0','tableNull']){const r=xp(fileOf(n),PATH);assert.equal(r.out,'');assert.notEqual(r.status,0,n+' must yield an empty node set')}})
test('XML paths (libxml2): documents the v2.4.1 defect: the bare path /row/c/text() misses the <table> shape; a bare <row> forest is not a single document',{skip:!hasXmllint&&'xmllint not installed'},()=>{
  assert.equal(xp(fileOf('table1'),'/row/c/text()').out,'','OLD path finds nothing in <table><row><c>');assert.equal(xp(fileOf('table1'),'/table/row/c/text()').out,'42')
  assert.equal(xp(fileOf('row1'),'/table/row/c/text()').out,'','the NEW-only path would miss the bare row shape (hence the | fallback)')
  for(const n of ['rows2','empty']){const r=xp(fileOf(n),PATH);assert.notEqual(r.status,0,n+' is not a single-root document: xpath() cannot read it');assert.equal(r.out,'')}})
test('v2.4.2 verify check 64: the migration owner must be able to write a Realtime signal; a problem is a WARN (live updates fall back to polling), not a FAIL, and it is SKIP before 003',()=>{
  const m=/select 64,'F realtime'[^]*?from state s\s+left join pg_class c[^]*?\n\n/.exec(verify);assert.ok(m,'check 64 exists');const t=m[0]
  assert.match(t,/has_table_privilege\(o\.oid,c\.oid,'insert'\)/);assert.match(t,/rolbypassrls/);assert.match(t,/'PASS' else 'WARN'/);assert.match(t,/when s\.st='none' then 'SKIP'/);assert.doesNotMatch(t.replace(/when o\.oid is null or c\.oid is null then 'FAIL'/,''),/'FAIL'/)})
test('docs (v2.4.2): SETUP and TESTING describe the verification transaction assumptions accurately',()=>{
  const setup=rd('SETUP.md'),testing=rd('TESTING.md');for(const d of [setup,testing]){assert.doesNotMatch(d,/SET TRANSACTION READ ONLY (first|as the first)/i);assert.doesNotMatch(d,/exactly two statements/i)}
  assert.match(setup,/ONE statement/);assert.match(setup,/not\*{0,2} something PostgreSQL enforces/i);assert.match(testing,/transaction/i);assert.match(testing,/not (been )?executed|NOT RUN/i)})
