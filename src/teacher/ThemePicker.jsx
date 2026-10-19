import {THEMES} from '../themes.js'
import Icon from '../components/Icon.jsx'

export default function ThemePicker({value='aurora', onChoose}) {
  return <section className="card stack teacher-theme-card" aria-labelledby="theme-h">
    <div className="row"><div><p className="ad-admin-eyebrow">APPEARANCE</p><h2 id="theme-h">Site theme</h2></div><span className="spacer"/><span className="pill slate">Live</span></div>
    <p className="small">Choose the look students and teachers see. Changing the theme does not change appointments, availability, or booking rules.</p>
    <div className="theme-grid" role="radiogroup" aria-label="Site theme">
      {THEMES.map(t => <button key={t.id} type="button" className="theme-choice" data-preview={t.id} role="radio" aria-checked={value===t.id} onClick={()=>onChoose(t.id,t.name)}>
        <span className="theme-swatch" aria-hidden="true"><i/><i/><i/></span>
        <span className="theme-copy"><b>{t.name}</b><small>{t.season}</small><em>{t.description}</em></span>
        <span className="theme-check" aria-hidden="true">{value===t.id?<Icon name="check" size={16}/>:null}</span>
      </button>)}
    </div>
  </section>
}
