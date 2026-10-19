import {useEffect, useRef, useState, useCallback, createContext, useContext} from 'react'
import Icon from './Icon.jsx'
import {KIND_LABEL, KIND_TONE} from '../slotInfo.js'

export function Button({variant = '', size = '', busy = false, icon, children, className = '', ...p}) {
  return <button {...p} disabled={p.disabled || busy} aria-busy={busy || undefined} className={`btn ${variant} ${size} ${className}`.trim()}>
    {busy ? <span className="spin" aria-hidden="true" /> : icon && <Icon name={icon} size={18} />}{children}
  </button>
}
export const Pill = ({tone = 'slate', children}) => <span className={`pill ${tone}`}>{children}</span>
export const KindPill = ({kind}) => <Pill tone={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Pill>
export function Field({label, error, hint, children}) {
  return <label className="field"><span>{label}</span>{children}{hint && <span className="hint">{hint}</span>}{error && <span className="err" role="alert">{error}</span>}</label>
}
export function SelectControl({className = '', children, ...p}) {
  return <span className={('select-wrap ' + className).trim()}>
    <select {...p} className="select-control">{children}</select>
    <span className="select-chevron" aria-hidden="true" />
  </span>
}
export function Empty({title, children, action}) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>
}
export const Skeleton = ({h = 64, n = 1}) => <div aria-hidden="true" style={{display: 'grid', gap: 10}}>{Array.from({length: n}, (_, i) => <div key={i} className="skel" style={{height: h}} />)}</div>

/** Pointer-follow lighting for cards: sets two CSS variables, nothing else (no layout, no re-render). */
export function useGlow() {
  const raf = useRef(0)
  return {onPointerMove: e => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget, r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => { el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px') })
  }}
}
export function useMedia(query) {
  const get = () => typeof matchMedia === 'function' && matchMedia(query).matches
  const [v, setV] = useState(get)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const m = matchMedia(query), h = () => setV(m.matches)
    if (m.addEventListener) m.addEventListener('change', h)
    else m.addListener?.(h) // Safari/iOS < 14
    h()
    return () => {
      if (m.removeEventListener) m.removeEventListener('change', h)
      else m.removeListener?.(h)
    }
  }, [query])
  return v
}
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Modal sheet on the native <dialog> element: focus trap, Escape, backdrop, focus return come from the browser. Animates out, then closes. */
export function Sheet({label, onClose, wide = false, children, title}) {
  const ref = useRef(), closing = useRef(false)
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal() }, [])
  const finish = useCallback(() => { const d = ref.current; if (d && d.open) d.close() }, [])
  const request = useCallback(() => {
    if (closing.current) return; closing.current = true
    const d = ref.current; if (!d) return
    if (reducedMotion()) return finish()
    d.classList.add('out'); setTimeout(finish, 150)
  }, [finish])
  return <dialog ref={ref} className={'sheet' + (wide ? ' wide' : '')} aria-label={label} onClose={onClose}
    onCancel={e => { e.preventDefault(); request() }} onClick={e => e.target === ref.current && request()}>
    <div className="sheet-body"><div className="sheet-grab" aria-hidden="true" />
      {title ? <div className="sheet-head"><h2>{title}</h2><button className="btn ghost icon" aria-label="Close" onClick={request}><Icon name="x" /></button></div>
        : <button className="btn ghost icon sheet-x" aria-label="Close" onClick={request}><Icon name="x" /></button>}
      {typeof children === 'function' ? children(request) : children}
    </div></dialog>
}

// ---- toasts ----
const isThemeConfirmation = text => typeof text === 'string' && text.toLowerCase().includes('theme applied')
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({children}) {
  const [items, setItems] = useState([]), id = useRef(0), timers = useRef(new Map())
  const dismiss = useCallback(i => {
    clearTimeout(timers.current.get(i))
    timers.current.delete(i)
    setItems(a => a.filter(t => t.id !== i))
  }, [])
  // Dismissing a notification cancels its timer; unmounting clears any that remain.
  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer)
    timers.current.clear()
  }, [])
  const push = useCallback((text, tone = 'info') => {
    const i = ++id.current, duration = tone === 'bad' ? 7500 : 4500
    setItems(a => {
      // Rapid theme changes should show the latest theme confirmation, not contradictory old ones.
      const themeChange = isThemeConfirmation(text)
      const previous = themeChange ? a.filter(t => !isThemeConfirmation(t.text)) : a
      return [...previous.slice(-2), {id: i, text, tone, duration}]
    })
    timers.current.set(i, setTimeout(() => dismiss(i), duration))
  }, [dismiss])
  return <ToastCtx.Provider value={push}>{children}
    <div className="toasts" aria-label="Notifications">{items.map(t => <div key={t.id} className={'toast ' + t.tone} role={t.tone === 'bad' ? 'alert' : 'status'}>
      <span className="toast-symbol" aria-hidden="true"><Icon name={t.tone === 'ok' ? 'check' : t.tone === 'bad' ? 'alert' : 'info'} size={20} /></span>
      <div className="toast-content"><strong className="toast-title">{t.tone === 'ok' ? 'All set' : t.tone === 'bad' ? 'Something went wrong' : 'Notice'}</strong><span className="toast-message">{t.text}</span></div>
      <button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}><Icon name="x" size={16} /></button>
      <span className="toast-lifetime" style={{'--toast-duration': t.duration + 'ms'}} aria-hidden="true" />
    </div>)}</div>
  </ToastCtx.Provider>
}

// ---- confirmation dialog (replaces the browser's built-in dialogs so destructive actions are explicit, readable and testable) ----
const ConfirmCtx = createContext(async () => true)
export const useConfirm = () => useContext(ConfirmCtx)
export function ConfirmProvider({children}) {
  const [q, setQ] = useState(null)
  const ask = useCallback(opts => new Promise(res => setQ({...opts, res})), [])
  return <ConfirmCtx.Provider value={ask}>{children}
    {q && <Sheet label={q.title} onClose={() => { q.res(false); setQ(null) }}>{close => <div className="confirm">
      <h2>{q.title}</h2><p>{q.body}</p>
      <div className="row" style={{justifyContent: 'flex-end'}}>
        <Button onClick={close}>{q.cancel || 'Keep it'}</Button>
        <Button variant={q.danger ? 'danger' : 'primary'} onClick={() => { q.res(true); close() }}>{q.confirm || 'Confirm'}</Button>
      </div></div>}</Sheet>}
  </ConfirmCtx.Provider>
}
