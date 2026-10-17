import {Button, Field, useConfirm} from '../components/ui.jsx'
import {AboutAurora} from '../components/About.jsx'
export default function SettingsView({pol, setPol, auto, setAuto, tzv, setTzv, run, rosterOn = false, onWhatsNew}) {
  const confirm = useConfirm()
  const toggleRoster = async () => {
    const next = !rosterOn
    if (next && !(await confirm({title: 'Show a student roster?', confirm: 'Turn roster on', cancel: 'Keep it off',
      body: 'Students will see names ONLY for classmates who ticked the optional box when booking, and only if you have not hidden them. Everyone else shows as “Reserved — name hidden”. Students may be minors: get your school’s approval before turning this on.'}))) return
    run('admin_set_roster_public', {p_on: next}, {ok: next ? 'Public roster is ON. Only consenting, unhidden names are shown.' : 'Public roster is OFF. Students see availability only.'})
  }
  return <div className="ad-admin-page"><header className="ad-admin-pagehero ad-admin-settingshero"><div><p className="ad-admin-eyebrow">AURORA CONTROLS</p><h2>Your space. Your rules.</h2><p>Set conference policies, privacy choices, and the way the school day works.</p></div></header><div className="cols2 ad-admin-settings">
    <section className="card stack"><h2>Rules text</h2><Field label="Rules shown to students"><textarea rows="8" value={pol} onChange={e => setPol(e.target.value)} /></Field>
      <label className="chk"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /><span>While I change, delete, close or reopen slots, keep students out for 10 minutes after each change</span></label>
      <Field label="School time zone" hint="Use a name like America/New_York. Slot times and “today” follow this zone."><input value={tzv} onChange={e => setTzv(e.target.value)} /></Field>
      <div className="row"><Button variant="primary" onClick={() => run('admin_update_settings', {p_policy: pol, p_auto: auto, p_tz: tzv}, {ok: 'Settings saved.'})}>Save settings</Button></div></section>
    <div className="stack">
      <section className="card stack"><div className="row"><h2>Public student roster</h2><span className="spacer" /><span className={'pill ' + (rosterOn ? 'amber' : 'slate')}>{rosterOn ? 'On' : 'Off'}</span></div>
        <p className="small">Off (default): students see availability only and cannot retrieve any other student’s name. On: students see a roster that lists only classmates who agreed, minus any names you hide in Bookings. Names you hide always stay hidden. Needs school approval.</p>
        <div className="row"><Button variant={rosterOn ? '' : 'primary'} onClick={toggleRoster} aria-pressed={rosterOn}>{rosterOn ? 'Turn roster off' : 'Turn roster on…'}</Button></div></section>
      <section className="card stack"><h2>Maintenance</h2><p className="small">Holds expire by themselves after 15 seconds; these buttons only tidy up.</p>
        <div className="row"><Button onClick={() => run('admin_release_stale_holds', undefined, {ok: 'Expired holds cleared.'})}>Clear expired holds</Button><Button onClick={() => run('admin_end_edit', undefined, {ok: 'Editing lock ended.'})}>End editing lock</Button></div></section>
      <AboutAurora onWhatsNew={onWhatsNew} />
    </div>
  </div></div>
}
