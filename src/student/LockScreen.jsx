import {ControlButton, ControlLink} from '../components/ControlSurface.jsx'
import {lazy, Suspense, useRef, useState} from 'react'
import ThemeScene from '../components/ThemeScene.jsx'
import LiveBadge from '../components/Live.jsx'
import VisitorCounter from '../components/VisitorCounter.jsx'
import {VersionTag} from '../components/About.jsx'
import SoundToggle from './SoundToggle.jsx'
import {ARCADE_GAMES} from './arcade.js'
import Icon from '../components/Icon.jsx'
import '../styles/lockscreen.css'

const Arcade=lazy(()=>import('./Arcade.jsx'))

export default function LockScreen({message,live,theme='aurora'}) {
 const [arcade,setArcade]=useState(false)
 const launch=useRef(null)
 const closeArcade=()=>{
  setArcade(false)
  launch.current?.focus({preventScroll:true})
 }
 return <main className="ad-cosmos" data-theme={theme} aria-label="Booking temporarily paused">
  <div className="cosmos-scene" aria-hidden="true">
   <ThemeScene theme={theme} className="cosmos-random-stars" />
   <div className="cosmos-vignette"/>
  </div>
  <header className="cosmos-header">
   <div className="cosmos-brand"><span>CONFERENCE RESERVATIONS</span></div>
   <div className="cosmos-header-right"><VisitorCounter /><LiveBadge status={live}/><SoundToggle compact/></div>
  </header>
  <section className="cosmos-center cosmos-message-only" aria-labelledby="cosmos-title">
   <div className="pause-card">
    <span className="pause-emblem" aria-hidden="true"><Icon name="lock" size={25}/></span>
    <span className="interface-eyebrow">RESERVATIONS PAUSED</span>
    <h1 id="cosmos-title">{message || "We'll be back soon!"}</h1>
    <p className="cosmos-info"> Reservations are temporarily paused. Your existing appointment is safe. This page updates automatically.</p>
    <ControlButton type="button" className="cosmos-arcade-launch" ref={launch} onClick={()=>setArcade(true)}><span aria-hidden="true">✧</span> Play {ARCADE_GAMES[theme].name}</ControlButton>
   </div>
  </section>
  {arcade && <Suspense fallback={<p className="vh" role="status">Loading arcade…</p>}><Arcade key={theme} theme={theme} onClose={closeArcade}/></Suspense>}
  <footer className="cosmos-footer"><span>{ARCADE_GAMES[theme].footer}</span><span className="cosmos-footer-links"><ControlLink href="#admin">Teacher portal ↗</ControlLink><VersionTag/></span></footer>
 </main>
}
