// Dependency safety guard: runs offline. It encodes which Vite/esbuild versions are known-vulnerable (advisories below, researched 13 Oct 2026)
// and checks package.json and, when present, package-lock.json. It is NOT a replacement for `npm audit` (new advisories appear over time).
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs'
const rd=p=>fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'),exists=p=>fs.existsSync(new URL('../../'+p,import.meta.url))
const V=s=>{const m=/^(\d+)\.(\d+)\.(\d+)/.exec(s);return m?[+m[1],+m[2],+m[3]]:null}
const ge=(a,b)=>{const x=V(a),y=V(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2]}
/** Vite: GHSA-fx2h-pf6j-xcff (high) fixed in 6.4.3 / 7.3.5 / 8.0.16; the 5.x line has no security release. Also GHSA-p9ff-h696-f583, GHSA-4w7w-66w2-5vf9 (fixed earlier in the same lines). */
export const viteOk=v=>{const m=V(v)?.[0];return m===6?ge(v,'6.4.3')>=0:m===7?ge(v,'7.3.5')>=0:m===8?ge(v,'8.0.16')>=0:m>8}
/** esbuild: GHSA-67mh-4wv8-2f99 (<=0.24.2, fixed 0.25.0); GHSA-g7r4-m6w7-qqqr (0.27.3 to 0.28.0, fixed 0.28.1). */
export const esbuildOk=v=>V(v)!==null&&ge(v,'0.25.0')>=0&&!(ge(v,'0.27.3')>=0&&ge(v,'0.28.1')<0)
const floor=r=>/(\d+\.\d+\.\d+)/.exec(r)?.[1]
test('advisory predicates classify known versions correctly',()=>{
  for(const v of ['5.4.21','5.4.0','6.4.2','7.3.4','7.0.0','8.0.15'])assert.equal(viteOk(v),false,'vite '+v+' must be flagged')
  for(const v of ['6.4.3','7.3.5','7.3.6','8.0.16'])assert.equal(viteOk(v),true,'vite '+v)
  for(const v of ['0.21.5','0.24.2','0.27.3','0.27.7','0.28.0'])assert.equal(esbuildOk(v),false,'esbuild '+v+' must be flagged')
  for(const v of ['0.25.0','0.25.12','0.27.2','0.28.1'])assert.equal(esbuildOk(v),true,'esbuild '+v)})
const pkg=JSON.parse(rd('package.json')),dev=pkg.devDependencies
test('package.json: vite floor is a patched, supported version',()=>assert.ok(viteOk(floor(dev.vite)),'vite '+dev.vite))
test('package.json: esbuild is pinned inside the patched 0.25 series that Vite 7 accepts (so one safe copy is shared)',()=>{assert.ok(esbuildOk(floor(dev.esbuild)));assert.match(dev.esbuild,/^\^0\.25\./,'caret on 0.25.x cannot drift into the 0.27.3-0.28.0 range')})
test('package.json: plugin-react is a version that declares Vite 7 support (4.7+)',()=>{const f=V(floor(dev['@vitejs/plugin-react']));assert.ok(f[0]>4||(f[0]===4&&f[1]>=7))})
test('package.json: React stays on 18 and Node engine matches Vite 7',()=>{assert.match(pkg.dependencies.react,/^\^18\./);assert.match(pkg.dependencies['react-dom'],/^\^18\./);assert.match(pkg.engines.node,/20\.19/);assert.match(pkg.engines.node,/22\.12/)})
test('deploy workflow uses a Node version Vite 7 supports',()=>{const m=/node-version:\s*(\d+)/.exec(rd('.github/workflows/deploy.yml'));assert.ok(m&&+m[1]>=22,'node-version '+(m&&m[1]))})
const hasLock=exists('package-lock.json')
test('package-lock.json: every installed vite, esbuild and @esbuild/* version is patched',{skip:hasLock?false:'package-lock.json is not in this folder (it is created by `npm install`); this check runs automatically once it exists'},()=>{
  const lock=JSON.parse(rd('package-lock.json'));let seen=0
  for(const [k,v] of Object.entries(lock.packages||{})){const n=k.split('node_modules/').pop()
    if(n==='vite'){seen++;assert.ok(viteOk(v.version),`${k} is ${v.version}`)}
    if(n==='esbuild'||n.startsWith('@esbuild/')){seen++;assert.ok(esbuildOk(v.version),`${k} is ${v.version}`)}}
  assert.ok(seen>0,'no vite/esbuild entries found: is this the right lockfile?')})
