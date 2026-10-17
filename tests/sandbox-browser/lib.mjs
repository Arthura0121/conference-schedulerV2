// Shared harness helper (v2.4.3). Same approach as run.mjs: compile the REAL src/ tree with TypeScript, run it in headless Chromium with React 19 from a global
// path (React 18 is not available offline) and swap ./sb.js for fake-sb.js. NO real Supabase, NO real Vite build. See TESTING.md.
import {createRequire} from 'node:module';import fs from 'node:fs';import path from 'node:path';import http from 'node:http'
const require=createRequire(import.meta.url),G=process.env.GLOBAL_NODE_MODULES||'/home/claude/.npm-global/lib/node_modules'
export async function startHarness({root=path.resolve(process.env.PROJECT_ROOT||path.join(import.meta.dirname,'../..'))}={}){
 const ts=require(path.join(G,'typescript')),{chromium}=require(path.join(G,'playwright')),out=fs.mkdtempSync('/tmp/harness-')
 const w=(f,c)=>{fs.mkdirSync(path.dirname(path.join(out,f)),{recursive:true});fs.writeFileSync(path.join(out,f),c)}
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])
 const cssFiles=[]
 for(const f of walk(path.join(root,'src'))){const rel=path.relative(path.join(root,'src'),f)
  if(/\.css$/.test(f)){w(rel,fs.readFileSync(f,'utf8'));cssFiles.push('/'+rel);continue}
  if(!/\.jsx?$/.test(f)||rel==='sb.js')continue
  const js=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
  w(rel.replace(/\.jsx$/,'.js'),js.replace(/from ['"]([^'"]+)\.jsx['"]/g,"from '$1.js'").replace(/from ['"]\.\/sb['"]/g,"from './sb.js'").replace(/import ['"][^'"]+\.css['"];?/g,''))}
 w('sb.js',fs.readFileSync(path.join(root,'tests/sandbox-browser/fake-sb.js'),'utf8'))
 const cj={react:'react/cjs/react.development.js','react/jsx-runtime':'react/cjs/react-jsx-runtime.development.js',scheduler:'react-dom/node_modules/scheduler/cjs/scheduler.development.js','react-dom':'react-dom/cjs/react-dom.development.js','react-dom/client':'react-dom/cjs/react-dom-client.development.js'}
 w('vendor.js',`const process={env:{NODE_ENV:'development'}},defs={},cache={};function req(n){if(cache[n])return cache[n].exports;const m={exports:{}};cache[n]=m;defs[n](m,m.exports,req);return m.exports}\n`+Object.entries(cj).map(([n,p])=>`defs[${JSON.stringify(n)}]=function(module,exports,require){${fs.readFileSync(path.join(G,p),'utf8')}\n};`).join('\n')+`\nexport const React=req('react'),JSX=req('react/jsx-runtime'),RDC=req('react-dom/client'),RD=req('react-dom');`)
 w('shim/rd.js',"import {RD} from '/vendor.js';export const {createPortal}=RD;")
 w('shim/react.js',"import {React} from '/vendor.js';export default React;export const {useState,useEffect,useCallback,useRef,useMemo,Fragment,createContext,useContext,useLayoutEffect}=React;")
 w('shim/jsx.js',"import {JSX} from '/vendor.js';export const {jsx,jsxs,Fragment}=JSX;");w('shim/rdc.js',"import {RDC} from '/vendor.js';export const {createRoot}=RDC;")
 w('index.html','<!doctype html><html lang="en"><head><meta charset=utf-8><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><script type="importmap">{"imports":{"react":"/shim/react.js","react/jsx-runtime":"/shim/jsx.js","react-dom/client":"/shim/rdc.js","react-dom":"/shim/rd.js"}}</script>'+['/style.css',...cssFiles.filter(c=>c!=='/style.css')].map(c=>`<link rel="stylesheet" href="${c}">`).join('')+'</head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>')
 const server=http.createServer((q,r)=>{const f=path.join(out,q.url.split('?')[0]==='/'?'index.html':q.url.split('?')[0]);if(!fs.existsSync(f)){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':'text/javascript'});r.end(fs.readFileSync(f))}).listen(0)
 const browser=await chromium.launch({args:['--no-sandbox']})
 return {base:`http://localhost:${server.address().port}/`,browser,out,close:async()=>{await browser.close();server.close()}}
}
