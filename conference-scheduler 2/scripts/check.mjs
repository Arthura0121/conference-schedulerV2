// Static checks that need no database and no network. Run: npm run check
import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module'
const require=createRequire(import.meta.url); const root=path.resolve(import.meta.dirname,'..')
let fails=0,skips=0; const pass=(n)=>console.log('PASS',n),fail=(n,d='')=>{fails++;console.log('FAIL',n,d)},skip=(n)=>{skips++;console.log('SKIPPED',n)}
const rd=p=>fs.readFileSync(path.join(root,p),'utf8')
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>['node_modules','dist','.git'].includes(e.name)?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])
const sql=rd('supabase/migrations/001_schema.sql')
// 1 every table has RLS and no grants to anon
for(const m of sql.matchAll(/create table (\w+)/g)) (new RegExp(`enable row level security`).test(sql)&&new RegExp(`alter table[^;]*\\b${m[1]}\\b[^;]*enable row level security|alter table ${m[1]} enable row level security`).test(sql))?pass('RLS enabled: '+m[1]):fail('RLS missing: '+m[1])
!/grant[^;]*to[^;]*\banon\b/i.test(sql)?pass('no grants to anon'):fail('grant to anon found')
!/create policy/i.test(sql)?pass('no RLS policies (function-only access)'):fail('unexpected policy')
// 2 functions
const fns=[...sql.matchAll(/create function (\w+)\(([\s\S]*?)\) returns [\s\S]*?\$\$([\s\S]*?)\$\$;/g)]
;(sql.match(/\$\$/g)||[]).length%2===0?pass('balanced $$ quoting'):fail('unbalanced $$')
for(const [,n,,b] of fns) if(n.startsWith('admin_')&&n!=='admin_check') b.includes('require_admin()')?pass('server-side admin check: '+n):fail('missing require_admin: '+n)
for(const [,n,,b] of fns) if(/security definer/.test(sql.slice(sql.indexOf('create function '+n),sql.indexOf('create function '+n)+800))&&!/set search_path/.test(sql.slice(sql.indexOf('create function '+n),sql.indexOf('create function '+n)+800)))fail('search_path unset: '+n)
const names=new Set(fns.map(f=>f[1])),helpers=new Set(['require_admin','log_event','is_locked','touch_edit_lock'])
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
