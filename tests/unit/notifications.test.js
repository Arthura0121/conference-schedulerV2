import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=path=>fs.readFileSync(new URL('../../'+path,import.meta.url),'utf8')

test('all notifications share one aligned icon, message and dismiss layout',()=>{
 const ui=read('src/components/ui.jsx')
 const css=read('src/styles/notifications.css')
 const main=read('src/main.jsx')
 for(const cls of ['toast-symbol','toast-content','toast-title','toast-message','toast-dismiss','toast-lifetime']){
  assert.ok(ui.includes('className="'+cls+'"'),cls+' missing in shared provider')
  assert.ok(css.includes('.toast-'+cls.slice(6)) || css.includes('.'+cls),cls+' not styled')
 }
 assert.match(css,/grid-template-columns:36px minmax\(0,1fr\) 30px/)
 assert.match(css,/align-items:center!important/)
 assert.match(css,/overflow-wrap:anywhere/)
 assert.match(css,/top:calc\(18px/)
 assert.match(css,/bottom:auto!important/)
 assert.match(css,/@media\(max-width:640px\)/)
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
 assert.ok(main.includes("import './styles/notifications.css'"))
})
test('notification appearances are customized for every seasonal theme',()=>{
 const css=read('src/styles/notifications.css')
 for(const theme of ['fall','halloween','winter'])assert.ok(css.includes(':root[data-theme="'+theme+'"] .toasts'),'missing '+theme+' notification skin')
 for(const tone of ['ok','bad','info'])assert.ok(css.includes('.toasts .toast.'+tone),'missing '+tone+' semantic notification')
})
test('rapid theme changes replace old theme alerts instead of stacking',()=>{
 const ui=read('src/components/ui.jsx')
 assert.match(ui,/isThemeConfirmation\(text\)/)
 assert.match(ui,/a.filter\(t => !isThemeConfirmation\(t.text\)\)/)
 assert.match(ui,/previous.slice\(-1\)/)
 assert.match(ui,/aria-label="Dismiss notification"/)
 assert.match(ui,/t.tone === 'bad' \? 'alert' : 'status'/)
})
