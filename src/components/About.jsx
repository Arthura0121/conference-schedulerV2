import {Sheet, Button} from './ui.jsx'
import Icon from './Icon.jsx'
import {APP_VERSION, BUILD_ID, versionLabel, buildLabel} from '../version.js'
import {CHANGELOG} from '../changelog.js'

/** Subtle version text. Only the version (and public build id); no configuration, URLs or keys. */
export const VersionTag = ({className = '', build = false}) => <span className={('vtag ' + className).trim()}><span className="vtag-name">English Conferences</span><span className="vtag-divider"> · </span><span>v{APP_VERSION}</span>{build && BUILD_ID !== 'local' ? <span className="vbuild"> · {buildLabel()}</span> : null}</span>

export function WhatsNew({onClose}) {
  return <Sheet label="What's new" title="What's new" wide onClose={onClose}>{() => <div className="whatsnew">
    {CHANGELOG.map(r => <section key={r.version} className="card"><div className="row"><h3>v{r.version} · {r.title}</h3><span className="spacer" /><span className="small">{r.date}</span></div>
      <p className="small"><b>{r.title}</b></p><ul>{r.items.map((t, i) => <li key={i}>{t}</li>)}</ul></section>)}</div>}</Sheet>
}

/** About application panel. Static text only. */
export function AboutConference({onWhatsNew}) {
  return <section className="card stack about" aria-labelledby="about-h"><div className="row"><h2 id="about-h">About English Conferences</h2><span className="spacer" /><span className="pill violet">v{APP_VERSION}</span></div>
    <p className="small">English Conference Scheduler. A calendar where students reserve a short writing conference and the teacher manages the schedule.</p>
    <dl className="kv"><dt>Version</dt><dd>{versionLabel()}</dd><dt>Build</dt><dd>{buildLabel()}</dd></dl>
    {onWhatsNew && <div className="row"><Button size="sm" icon="sparkle" onClick={onWhatsNew}>What&rsquo;s new</Button></div>}</section>
}
