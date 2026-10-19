import Brand from './Brand.jsx'
import ThemeScene from './ThemeScene.jsx'
import {safeTheme} from '../themes.js'
import Icon from './Icon.jsx'

/** Shared full-viewport state for first load, offline initialization and missing setup.
    Does not imply that booking data or authentication is already ready. */
export default function StatusScreen({theme='aurora',title,description,loading=false}){
 const visual=safeTheme(theme)
 return <main className="site-status" data-theme={visual} role={loading?'status':undefined} aria-live={loading?'polite':undefined}>
  <ThemeScene theme={visual}/>
  <section className="site-status-card">
   <div className="site-status-header"><Brand sub="Conferences"/><span className="site-status-theme" aria-hidden="true">{visual === 'fall' ? 'Autumn' : visual === 'halloween' ? 'Halloween' : visual === 'winter' ? 'Winter' : 'Aurora'}</span></div>
   <div className="site-status-mark" aria-hidden="true"><Icon name={loading ? 'sparkle' : 'alert'} size={26}/></div>
   <h1>{title}</h1>
   <p>{description}</p>
   {loading&&<div className="site-status-progress" aria-hidden="true"><span/></div>}
  </section>
 </main>
}
