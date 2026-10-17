import Icon from '../components/Icon.jsx'
import {Button, Field, Pill} from '../components/ui.jsx'
const iso = v => v ? new Date(v).toISOString() : null
export default function LockdownView({cfg, lm, setLm, lf, setLf, lu, setLu, run, toast}) {
  const nowD = new Date(), sched = cfg.lock_from && new Date(cfg.lock_from) <= nowD && (!cfg.lock_until || new Date(cfg.lock_until) > nowD), locked = cfg.locked || sched
  const editing = cfg.edit_lock_until && new Date(cfg.edit_lock_until) > nowD
  return <div className="lockv ad-admin-lockdown"><header className="ad-admin-pagehero ad-admin-lockhero"><div><p className="ad-admin-eyebrow">ACCESS CONTROL · STUDENT SITE</p><h2>Control the doors.</h2><p>Pause reservations instantly, or schedule a precise reopening.</p></div></header>
    <section className={'lockhero ' + (locked ? 'on' : 'off')}><Icon name={locked ? 'lock' : 'unlock'} size={34} />
      <div><h2>{locked ? 'Student site is LOCKED' : 'Student site is open'}</h2>
        <p className="small">Currently: <b>{cfg.locked ? 'LOCKED' : 'open'}</b>{cfg.lock_from && ` · scheduled from ${new Date(cfg.lock_from).toLocaleString()}`}{cfg.lock_until && ` until ${new Date(cfg.lock_until).toLocaleString()}`}{editing && ' · editing lock active'}</p></div>
      <Pill tone={locked ? 'rose' : 'mint'}>{locked ? 'Locked' : 'Open'}</Pill></section>
    <section className="card stack"><p className="small">Times use this computer's clock/time zone. If you fill in “Reopens at”, Lock now reopens automatically then; otherwise it stays locked until you unlock.</p>
      <Field label="Message students see"><input value={lm} onChange={e => setLm(e.target.value)} /></Field>
      <div className="grid2"><Field label="Scheduled lock starts (optional)"><input type="datetime-local" value={lf} onChange={e => setLf(e.target.value)} /></Field><Field label="Reopens at (optional)"><input type="datetime-local" value={lu} onChange={e => setLu(e.target.value)} /></Field></div>
      <div className="row">
        <Button variant="danger" icon="lock" onClick={() => run('admin_set_lockdown', lu ? {p_locked: false, p_msg: lm, p_from: new Date(Date.now() - 60000).toISOString(), p_until: iso(lu)} : {p_locked: true, p_msg: lm, p_from: null, p_until: null}, {confirm: {title: 'Lock the student site now?', body: lu ? 'Students are locked out now and the site reopens automatically at the reopen time.' : 'Students are locked out until you unlock it.', confirm: 'Lock now', danger: true}, ok: 'Student site locked.'})}>Lock now</Button>
        <Button icon="unlock" onClick={() => run('admin_set_lockdown', {p_locked: false, p_msg: lm, p_from: null, p_until: null}, {ok: 'Unlocked. Students can book again.'})}>Unlock now (clears all locks)</Button>
        <Button onClick={() => { if (!lf) { toast('Choose when the scheduled lock starts first.', 'bad'); return } run('admin_set_lockdown', {p_locked: cfg.locked, p_msg: lm, p_from: iso(lf), p_until: iso(lu)}, {ok: 'Lock schedule saved.'}) }}>Save schedule</Button></div></section>
  </div>
}
