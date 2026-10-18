import Brand from './Brand.jsx'
import ThemeScene from './ThemeScene.jsx'
import {safeTheme} from '../themes.js'

/** Shared full-viewport state for first load, offline initialization and missing setup.
    Does not imply that booking data or authentication is already ready. */
export default function StatusScreen({theme='aurora',title,description,loading=false}){
 const visual=safeTheme(theme)
 return <main className="site-status" data-theme={visual} role={loading?'status':undefined} aria-live={loading?'polite':undefined}>
  <ThemeScene theme={visual}/>
  <section className="site-status-card">
   <Brand sub="Conferences"/>
   <span className="site-status-mark" aria-hidden="true">{loading?'✦':'!'}</span>
   <h1>{title}</h1>
   <p>{description}</p>
   {loading&&<span className="site-status-loader" aria-hidden="true"/>}
  </section>
 </main>
}
