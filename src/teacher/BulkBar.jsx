import {useLayoutEffect, useRef} from 'react'
import {createPortal} from 'react-dom'
import Icon from '../components/Icon.jsx'
import {Button} from '../components/ui.jsx'
import {keyboardInset} from '../bulk.js'

// The floating bulk toolbar publishes its REAL size so the page can leave exactly enough room under the last row.
// Why: the old code used a fixed 150px guess. On a phone the bar wraps to 2-3 rows and sits above the bottom tabs, so it hid ~200px+.
// Three numbers are measured (never guessed) and written to :root as CSS variables, and body gets .bulk-active only while the bar exists:
//   --bulkbar-h  the bar's rendered height        (ResizeObserver: follows wrapping, text zoom, rotation)
//   --bnav-h     the fixed bottom tabs' height    (includes the device safe-area inset; 0 when there are no tabs)
//   --kb         on-screen keyboard height        (visualViewport; 0 unless it is clearly a keyboard; see keyboardInset in bulk.js)
// All three are removed again when the bar goes away, so nothing extra is reserved when nothing is selected.
export default function BulkBar({count, hidden = 0, onOpen, onClose, onClear}) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current, root = document.documentElement, body = document.body
    if (!el) return undefined
    const vv = window.visualViewport
    const apply = () => {
      const nav = document.querySelector('nav.bnav')
      root.style.setProperty('--bulkbar-h', Math.ceil(el.getBoundingClientRect().height) + 'px')
      root.style.setProperty('--bnav-h', (nav ? Math.ceil(nav.getBoundingClientRect().height) : 0) + 'px')
      root.style.setProperty('--kb', (vv ? keyboardInset(window.innerHeight, vv.height, vv.offsetTop) : 0) + 'px')
    }
    apply()                            // variables FIRST, class second: with the class but no variables the page would briefly reserve too little room and the browser would clamp (jump) the scroll position
    body.classList.add('bulk-active')
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(apply) : null
    ro?.observe(el); const nav = document.querySelector('nav.bnav'); if (nav) ro?.observe(nav)
    vv?.addEventListener('resize', apply); vv?.addEventListener('scroll', apply); window.addEventListener('resize', apply); window.addEventListener('orientationchange', apply)
    return () => {
      ro?.disconnect(); vv?.removeEventListener('resize', apply); vv?.removeEventListener('scroll', apply); window.removeEventListener('resize', apply); window.removeEventListener('orientationchange', apply)
      body.classList.remove('bulk-active'); for (const k of ['--bulkbar-h', '--bnav-h', '--kb']) root.style.removeProperty(k)
    }
  }, [])
  return createPortal(<div ref={ref} className="bulkbar" role="region" aria-label="Selected appointments actions"><b className="num">{count} selected{hidden > 0 && <span className="small"> · {hidden} hidden by filters</span>}</b>
    <Button size="sm" variant="primary" icon="unlock" onClick={onOpen}>Open selected</Button>
    <Button size="sm" icon="lock" onClick={onClose}>Close selected</Button>
    <Button size="sm" variant="ghost" icon="x" onClick={onClear}>Clear selection</Button></div>, document.body)
}
