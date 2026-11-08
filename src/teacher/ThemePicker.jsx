import {ControlButton} from '../components/ControlSurface.jsx'
import {THEMES} from '../themes.js'
import Icon from '../components/Icon.jsx'

const groups = ['Atmospheres','Seasons','Holidays','School']

export default function ThemePicker({value='aurora', onChoose}) {
  return <section className="card stack teacher-theme-card" aria-labelledby="theme-h">
    <div className="row"><div><p className="ad-admin-eyebrow">APPEARANCE</p><h2 id="theme-h">Site theme</h2></div><span className="spacer"/><span className="pill slate">Live</span></div>
    <p className="small">Choose the look students and teachers see. Each world has its own scenery, controls and interaction effects.</p>
    <div className="theme-groups" role="radiogroup" aria-label="Site theme">
      {groups.map(group=><div key={group} role="group" aria-label={group}>
        <h3 className="theme-group-title">{group}</h3>
        <div className="theme-grid">
          {THEMES.filter(t=>t.group===group).map(t=><ControlButton key={t.id} type="button" className="theme-choice" data-preview={t.id} role="radio" aria-checked={value===t.id} onClick={()=>onChoose(t.id,t.name)}>
            <span className="theme-swatch" data-theme={t.icon?t.id:undefined} aria-hidden="true">
              {t.icon?<span className="theme-swatch-icon">{t.icon}</span>:<><i/><i/><i/></>}
            </span>
            <span className="theme-copy"><b>{t.name}</b><small>{t.season}</small><em>{t.description}</em></span>
            <span className="theme-check" aria-hidden="true">{value===t.id?<Icon name="check" size={16}/>:null}</span>
          </ControlButton>)}
        </div>
      </div>)}
    </div>
  </section>
}
