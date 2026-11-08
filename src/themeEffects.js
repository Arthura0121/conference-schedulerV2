const target = '[data-control-surface]'
const blocked = ':disabled,[aria-disabled="true"],[inert]'
const activationKey = key => key === 'Enter' || key === ' '

function surfaceFor(node) {
 const control = node?.closest?.(target)
 return control && !control.closest(blocked) ? control : null
}

export function surfacePosition(rect,x,y) {
 const percent = (value,start,size) => size > 0 ? Math.max(0,Math.min(100,100*(value-start)/size)) : 50
 return [percent(x,rect.left,rect.width),percent(y,rect.top,rect.height)]
}

export function attachThemeEffects(doc = document, win = window) {
 const motion = win.matchMedia('(prefers-reduced-motion: reduce)')
 const releaseTimers = new Map()
 let hover = null
 let held = null
 let frame = 0

 function write(control,x,y) {
  const [px,py] = motion.matches || x==null ? [50,50] : surfacePosition(control.getBoundingClientRect(),x,y)
  control.style.setProperty('--surface-x',px.toFixed(1)+'%')
  control.style.setProperty('--surface-y',py.toFixed(1)+'%')
  control.style.setProperty('--surface-slide',((px-50)*.45).toFixed(1)+'px')
 }

 function queue(control,event) {
  win.cancelAnimationFrame(frame)
  if (motion.matches) return
  const {clientX,clientY} = event
  frame = win.requestAnimationFrame(()=>{
   if (control.isConnected) write(control,clientX,clientY)
  })
 }

 function clearRelease(control) {
  win.clearTimeout(releaseTimers.get(control))
  releaseTimers.delete(control)
  delete control.dataset.surfaceRelease
 }

 function finish(animate) {
  if (!held) return
  const {control} = held
  held = null
  delete control.dataset.surfacePress
  if (animate && control.isConnected && !motion.matches) {
   control.dataset.surfaceRelease = ''
   releaseTimers.set(control,win.setTimeout(()=>clearRelease(control),700))
  }
 }

 function begin(control,source,id,event) {
  clearRelease(control)
  write(control,event?.clientX,event?.clientY)
  held = {control,source,id}
  control.dataset.surfacePress = source
 }

 function pointerOver(event) {
  if (event.pointerType !== 'mouse') return
  const control = surfaceFor(event.target)
  if (!control || control===hover) return
  if (hover) delete hover.dataset.surfaceHover
  hover = control
  hover.dataset.surfaceHover = ''
  queue(control,event)
 }

 function pointerOut(event) {
  if (event.pointerType !== 'mouse' || !hover || hover.contains(event.relatedTarget)) return
  delete hover.dataset.surfaceHover
  hover = null
 }

 function pointerDown(event) {
  if (!event.isPrimary || event.button!==0 || held) return
  const control = surfaceFor(event.target)
  if (control) begin(control,event.pointerType,event.pointerId,event)
 }

 function pointerMove(event) {
  if (held?.id===event.pointerId) queue(held.control,event)
  else if (event.pointerType==='mouse' && hover) queue(hover,event)
 }

 function pointerEnd(event) {
  if (held?.id===event.pointerId) {
   win.cancelAnimationFrame(frame)
   if (event.type==='pointerup') write(held.control,event.clientX,event.clientY)
   finish(event.type==='pointerup')
  }
 }

 function keyDown(event) {
  if (held || event.repeat || !activationKey(event.key)) return
  const control = surfaceFor(event.target)
  if (control) begin(control,'keyboard',event.key)
 }

 function keyUp(event) {
  if (held?.source==='keyboard' && held.id===event.key) finish(true)
 }

 function blur() {
  win.cancelAnimationFrame(frame)
  finish(false)
  if (hover) delete hover.dataset.surfaceHover
  hover = null
 }

 function focusOut(event) {
  if (held?.source==='keyboard' && held.control===event.target) finish(false)
 }

 const listeners = [
  [doc,'pointerover',pointerOver], [doc,'pointerout',pointerOut], [doc,'pointerdown',pointerDown],
  [doc,'pointermove',pointerMove], [doc,'pointerup',pointerEnd], [doc,'pointercancel',pointerEnd],
  [doc,'keydown',keyDown], [doc,'keyup',keyUp], [doc,'focusout',focusOut], [win,'blur',blur]
 ]
 for (const [element,type,listener] of listeners) element.addEventListener(type,listener,true)
 return ()=>{
  blur()
  for (const control of releaseTimers.keys()) clearRelease(control)
  for (const [element,type,listener] of listeners) element.removeEventListener(type,listener,true)
 }
}
