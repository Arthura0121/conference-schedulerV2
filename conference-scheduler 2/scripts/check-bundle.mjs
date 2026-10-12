// After `npm run build`: make sure no secret-looking content shipped in dist/.
import fs from 'node:fs';import path from 'node:path'
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])
let bad=0;const files=walk('dist');console.log('dist files:',files.length)
for(const f of files){if(/\.(js|html|css|map)$/.test(f)){const t=fs.readFileSync(f,'utf8');if(/service_role/.test(t)||/postgres(ql)?:\/\//.test(t)){bad++;console.log('FAIL secret-like text in',f)}}if(/(^|\/)\.env/.test(f)){bad++;console.log('FAIL env file in dist',f)}}
console.log(bad?'FAIL':'PASS','bundle secret scan');process.exit(bad?1:0)
