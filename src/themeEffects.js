// SVG marks share a 24-unit viewBox so their size stays consistent on touch targets.
const marks = {
 star:'M12 1l2.8 8.2L23 12l-8.2 2.8L12 23l-2.8-8.2L1 12l8.2-2.8Z',
 maple:'M12 1l3 5 4-1-1 5 5 2-4 4 1 3-7 1v3h-2v-3l-7-1 1-3-4-4 5-2-1-5 4 1Z',
 bat:'M12 10 10 6l-1 4C6 6 3 5 0 5l2 7 4-1 1 4 4-1 1 5 1-5 4 1 1-4 4 1 2-7c-3 0-6 1-9 5l-1-4Z',
 wheat:'M11 22h2v-7c6 1 9-4 9-8-4 0-8 1-9 5V7c5-1 6-5 5-7-4 0-6 3-6 6-1-4-4-5-7-4 0 4 3 6 6 6v6C9 10 5 9 2 10c1 5 4 8 9 7Z',
 crystal:'M11 1h2v6l4-3 1 2-5 4v1h1l5-3 1 2-4 2 4 2-1 2-5-3h-1v1l5 4-1 2-4-3v6h-2v-6l-4 3-1-2 5-4v-1h-1l-5 3-1-2 4-2-4-2 1-2 5 3h1v-1L6 6l1-2 4 3Z',
 petal:'M12 2c4 2 3 6 7 8 2 7-3 11-9 12C4 21 2 16 4 11c2-3 5-3 8-9Z',
 dot:'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
 ring:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z',
 drop:'M12 1c2 5 8 9 8 14a8 8 0 1 1-16 0c0-5 6-9 8-14Z',
 kite:'M12 1 21 12 12 23 3 12Z',
 heart:'M12 22 3 13C-4 6 6-2 12 6c6-8 16 0 9 7Z',
 confetti:'M3 2h6v17H3Zm12 7h6v13h-6Z',
 chalk:'M2 14 16 3l3 3L5 17Zm5 4 8-6 2 2-8 6Z',
 electron:'M13 1a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM5 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'
}

export const EFFECTS = {
 aurora:{name:'constellation', marks:['star','kite','dot'], colors:['#befff4','#a8baff','#ffefff'], travel:'orbit'},
 fall:{name:'maple', marks:['maple','maple','dot'], colors:['#ffb357','#e77742','#a74c46'], travel:'flutter'},
 halloween:{name:'bats', marks:['bat','bat','star'], colors:['#bd88f6','#6a417b','#e9ff8e'], travel:'flock'},
 thanksgiving:{name:'harvest', marks:['wheat','star','maple'], colors:['#ffd779','#f98a4d','#e989ad'], travel:'rise'},
 winter:{name:'snowflake', marks:['crystal','crystal','dot'], colors:['#eeffff','#b7ebf8','#d9f6ff'], travel:'snow'},
 blossom:{name:'petals', marks:['petal','petal','dot'], colors:['#cf548c','#f594be','#ffdde6'], travel:'flutter'},
 firefly:{name:'fireflies', marks:['dot','star','dot'], colors:['#f5ffa5','#badb76','#8af0c0'], travel:'swarm'},
 'studio-snowday':{name:'powder', marks:['dot','crystal','dot'], colors:['#fff','#79b5d6','#effaff'], travel:'snow'},
 'studio-boardwalk':{name:'bubbles', marks:['ring','ring','dot'], colors:['#147e94','#f56f67','#fff3b5'], travel:'bubble'},
 'studio-monsoon':{name:'ripples', marks:['ring','drop','drop'], colors:['#d5ffec','#9bd8ce','#a2e4ff'], travel:'rain'},
 'studio-lunar':{name:'lantern sparks', marks:['kite','dot','star'], colors:['#ffdb7e','#ff995e','#fff0af'], travel:'rise'},
 'studio-valentine':{name:'hearts', marks:['heart','heart','star'], colors:['#b72c61','#e7658f','#ffb4cb'], travel:'bubble'},
 'studio-newyear':{name:'confetti', marks:['confetti','kite','star'], colors:['#fbe2a1','#ddb16e','#ede4f8'], travel:'burst'},
 'studio-notebook':{name:'chalk', marks:['chalk','dot','kite'], colors:['#325d89','#3d847c','#cc7947'], travel:'chalk'},
 'studio-science':{name:'electrons', marks:['electron','ring','dot'], colors:['#befee0','#ceadf2','#ffd490'], travel:'orbit'}
}

const controls = 'button,a[href],summary,[role="button"],input[type="checkbox"],input[type="radio"],input[type="submit"]'
const ns = 'http://www.w3.org/2000/svg'

function controlFor(node) {
 const control = node?.closest?.(controls)
 return control && !control.closest(':disabled,[aria-disabled="true"],[inert]') ? control : null
}

export function attachThemeEffects(doc = document, win = window) {
 const motion = win.matchMedia('(prefers-reduced-motion: reduce)')
 const overlays = new Map()
 const bursts = new Map()
 let lastHover = -Infinity

 function clean(burst) {
  clearTimeout(bursts.get(burst))
  bursts.delete(burst)
  const overlay = burst.parentElement
  burst.remove()
  if (overlay && !overlay.childElementCount) {
   overlays.delete(overlay.parentElement)
   overlay.remove()
  }
 }

 function emit(event, control, ambient) {
  if (motion.matches) return
  const theme = control.closest('[data-theme]')?.dataset.theme || doc.documentElement.dataset.theme
  const effect = EFFECTS[theme]
  if (!effect) return
  const bounds = control.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return

  if (bursts.size >= 5) clean(bursts.keys().next().value)
  const host = control.closest('dialog[open]') || doc.body
  let overlay = overlays.get(host)
  if (!overlay?.isConnected) {
   overlay = doc.createElement('span')
   overlay.className = 'theme-fx-overlay'
   overlay.setAttribute('aria-hidden','true')
   host.append(overlay)
   overlays.set(host,overlay)
  }
  const origin = overlay.getBoundingClientRect()
  const keyboard = !ambient && event.detail === 0
  const x = keyboard ? bounds.left+bounds.width/2 : Math.max(bounds.left,Math.min(bounds.right,event.clientX))
  const snowfall = effect.travel === 'snow'
  const y = snowfall ? bounds.bottom : keyboard ? bounds.top+bounds.height/2 : Math.max(bounds.top,Math.min(bounds.bottom,event.clientY))
  const burst = doc.createElement('span')
  burst.className = 'theme-fx-burst'
  burst.dataset.effect = effect.name
  burst.dataset.travel = effect.travel
  burst.dataset.trigger = ambient ? 'hover' : keyboard ? 'keyboard' : 'pointer'
  burst.style.left = x-origin.left+'px'
  burst.style.top = y-origin.top+'px'
  burst.style.setProperty('--fx-accent',effect.colors[0])
  if (!ambient) {
   const halo = doc.createElement('span')
   halo.className = 'theme-fx-halo'
   burst.append(halo)
  }
  const count = ambient ? 3 : 8
  for (let i=0;i<count;i++) {
   const sprite = doc.createElementNS(ns,'svg')
   const path = doc.createElementNS(ns,'path')
   sprite.setAttribute('viewBox','0 0 24 24')
   sprite.setAttribute('focusable','false')
   sprite.classList.add('theme-fx-mark')
   path.setAttribute('d',marks[effect.marks[i%effect.marks.length]])
   path.setAttribute('fill',effect.colors[i%effect.colors.length])
   sprite.append(path)
   const angle = i/count*Math.PI*2+0.3
   const distance = (ambient ? 22 : 39)+(i%3)*10
   sprite.style.setProperty('--dx',Math.round(Math.cos(angle)*distance)+'px')
   sprite.style.setProperty('--dy',Math.round(Math.sin(angle)*distance)+'px')
   sprite.style.setProperty('--drop',(26+i%4*13)+'px')
   sprite.style.setProperty('--spin',(i%2 ? -1 : 1)*(38+i*17)+'deg')
   sprite.style.setProperty('--delay',i*19+'ms')
   sprite.style.setProperty('--size',(ambient ? 7+i%3*2 : 9+i%4*4)+'px')
   burst.append(sprite)
  }
  overlay.append(burst)
  bursts.set(burst,setTimeout(()=>clean(burst),1200))
 }

 function press(event) {
  if (event.button !== 0) return
  const control = controlFor(event.target)
  if (control) emit(event,control,false)
 }
 function hover(event) {
  if (motion.matches || event.pointerType !== 'mouse' || event.buttons) return
  const control = controlFor(event.target)
  if (!control || control.contains(event.relatedTarget) || win.performance.now()-lastHover<180) return
  lastHover = win.performance.now()
  emit(event,control,true)
 }
 doc.addEventListener('click',press,true)
 doc.addEventListener('pointerover',hover,true)
 return () => {
  doc.removeEventListener('click',press,true)
  doc.removeEventListener('pointerover',hover,true)
  for (const burst of bursts.keys()) clean(burst)
 }
}
