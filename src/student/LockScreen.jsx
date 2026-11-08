import {ControlButton, ControlLink} from '../components/ControlSurface.jsx'
import {useRef, useState} from 'react'
import ThemeScene from '../components/ThemeScene.jsx'
import LiveBadge from '../components/Live.jsx'
import {VersionTag} from '../components/About.jsx'
import SoundToggle from './SoundToggle.jsx'
import Arcade from './Arcade.jsx'
import {ARCADE_GAMES} from './arcade.js'
import '../styles/lockscreen.css'

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
   <div className="cosmos-header-right"><LiveBadge status={live}/><SoundToggle compact/></div>
  </header>
  <section className="cosmos-center cosmos-message-only" aria-labelledby="cosmos-title">
   <h1 id="cosmos-title">{message || "We'll be back soon!"}</h1>
   <p className="cosmos-info"><span className="cosmos-info-light"/> Reservations are temporarily paused. Your existing appointment is safe. This page updates automatically.</p>
   <ControlButton type="button" className="cosmos-arcade-launch" ref={launch} onClick={()=>setArcade(true)}><span aria-hidden="true">✧</span> Play {ARCADE_GAMES[theme].name}</ControlButton>
  </section>
  {arcade && <Arcade key={theme} theme={theme} onClose={closeArcade}/>}
  <footer className="cosmos-footer"><span>{ARCADE_GAMES[theme].footer}</span><span className="cosmos-footer-links"><ControlLink href="#admin">Teacher portal ↗</ControlLink><VersionTag/></span></footer>
 </main>
}
