import {useEffect, useRef, useState} from 'react'
import Icon from '../components/Icon.jsx'
import {Button, Sheet} from '../components/ui.jsx'
import {friendly} from '../lib.js'
import {bulkExplain, staleNote, MAX_BULK} from '../bulk.js'

const ROWS = [['requested', 'Total selected', ''], ['eligible', 'Will change', 'mint'], ['already', 'Already open / closed', ''], ['paper', 'Taken on paper (protected)', 'amber'],
  ['booked', 'Online bookings (protected)', 'violet'], ['past', 'In the past (protected)', ''], ['draft', 'Drafts (not touched)', ''], ['needs_opt_in', 'Marked unavailable (not included)', '']]

/** Confirmation dialog for every bulk action. The numbers come from the SERVER (dry run). Pressing confirm runs the server again, which re-checks each appointment. */
export default function BulkDialog({ids: liveIds, avail, scope: liveScope, rpc, run, onClose}) {
  // FREEZE the list the teacher chose when this dialog opened. The parent recomputes ids on every live refresh; if the dialog followed it, the numbers the teacher
  // confirmed (preview) could describe a different set than the one the action runs on. The server still re-checks every appointment at confirm time.
  const [snap] = useState(() => ({ids: [...liveIds], scope: liveScope})), ids = snap.ids, scope = snap.scope
  const [other, setOther] = useState(false), [pv, setPv] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), seq = useRef(0)
  const tooMany = ids.length > MAX_BULK
  useEffect(() => {
    if (tooMany) return
    const my = ++seq.current; setPv(null); setErr('')
    rpc('admin_bulk_set_available', {p_ids: ids, p_avail: avail, p_include_other: other, p_dry_run: true})
      .then(r => { if (my === seq.current) setPv(r) }).catch(e => { if (my === seq.current) setErr(friendly(e)) })
    return () => { seq.current++ }
  }, [other])   // eslint-disable-line
  const r = pv && {...pv, already: pv.already_open + pv.already_closed}
  const verb = avail ? 'Open' : 'Close'
  const go = async close => {
    setBusy(true); const expected = pv ? pv.eligible : NaN
    const ok = await run('admin_bulk_set_available', {p_ids: ids, p_avail: avail, p_include_other: other, p_dry_run: false},
      {okFn: x => `${avail ? 'Opened' : 'Closed'} ${x.changed} appointment${x.changed === 1 ? '' : 's'}. ${x.requested - x.changed} left unchanged.${x.holds_released ? ` ${x.holds_released} active hold${x.holds_released === 1 ? '' : 's'} released.` : ''}${staleNote(expected, x.changed)}`})
    setBusy(false); if (ok) close()
  }
  return <Sheet label={`${verb} appointments`} title={`${verb} ${ids.length} appointment${ids.length === 1 ? '' : 's'}?`} onClose={onClose}>{close => <div className="bulkdlg">
    <p>{verb} <b>{scope}</b>. The server checks every appointment again when you confirm.</p>
    {tooMany ? <div className="callout warn" role="alert"><Icon name="alert" /><p>That is more than {MAX_BULK} appointments at once. Narrow the filters or the date range and try again.</p></div>
      : err ? <div className="callout warn" role="alert"><Icon name="alert" /><p>{err} The preview could not be loaded, so nothing was changed.</p></div>
      : !r ? <p className="small" role="status">Checking each appointment on the server…</p>
      : <>
        <dl className="bulkgrid" aria-label="What will happen">{ROWS.filter(([k]) => k === 'requested' || k === 'eligible' || r[k] > 0).map(([k, l, tone]) => <div key={k} className={'bulkcell ' + tone}><dt>{l}</dt><dd className="num">{r[k]}</dd></div>)}</dl>
        <div className="callout" role="note"><Icon name="info" /><p>{bulkExplain(avail, r)}</p></div>
        {avail && (r.needs_opt_in > 0 || other) && <label className="chk"><input type="checkbox" checked={other} onChange={e => setOther(e.target.checked)} /><span>Also open appointments marked “Not available” or closed for another reason{!other ? ` (${r.needs_opt_in} found)` : ''}. Their reason text will be cleared.</span></label>}
        <p className="small">Never changed by bulk actions: appointments taken on paper, with online bookings, in the past, or drafts. To release a paper appointment, open it on its own in the editor.</p></>}
    <div className="row" style={{justifyContent: 'flex-end'}}><Button onClick={close}>Cancel</Button>
      <Button variant={avail ? 'primary' : 'danger'} busy={busy} disabled={!r || r.eligible === 0 || tooMany} onClick={() => go(close)}>{r ? `${verb} ${r.eligible} appointment${r.eligible === 1 ? '' : 's'}` : verb}</Button></div></div>}</Sheet>
}
