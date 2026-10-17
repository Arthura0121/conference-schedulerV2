import {useEffect, useRef, useState} from 'react'
import Icon from '../components/Icon.jsx'
import LiveBadge from '../components/Live.jsx'
import {VersionTag} from '../components/About.jsx'
import SoundToggle from './SoundToggle.jsx'
import {sound} from '../sound.js'
import '../styles/lockscreen.css'

const SPARKS = Array.from({length: 34}, (_, i) => ({
  left: ((i * 73 + 13) % 97) + '%',
  top: ((i * 41 + 8) % 91) + '%',
  delay: ((i * 7) % 23) / 3 + 's',
  duration: (2 + i % 5) + 's'
}))
const ORBS = [
  {x:14,y:19},{x:82,y:15},{x:91,y:67},{x:67,y:84},
  {x:26,y:80},{x:7,y:56},{x:55,y:12}
]
const SECONDS=30
/** A purely local Easter egg. All locking, booking permissions, and auto-unlock still come from Supabase. */
export default function LockScreen({message,live}) {
  const [secret,setSecret]=useState(false)
  const [playing,setPlaying]=useState(false)
  const [round,setRound]=useState(0)
  const [score,setScore]=useState(0)
  const [seconds,setSeconds]=useState(SECONDS)
  const [done,setDone]=useState(false)
  const frame=useRef(null), root=useRef(null)
  const scoreRef=useRef(0),active=useRef(false),last=useRef(0)
  const move=e=>{
    if(!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return
    const r=root.current.getBoundingClientRect()
    const x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100
    if(frame.current)return
    frame.current=requestAnimationFrame(()=>{frame.current=null;root.current?.style.setProperty('--px',x+'%');root.current?.style.setProperty('--py',y+'%')})
  }
  useEffect(()=>()=>{if(frame.current)cancelAnimationFrame(frame.current)},[])
  useEffect(()=>{
    if(!playing)return
    const i=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000)
    return()=>clearInterval(i)
  },[playing,round])
  useEffect(()=>{if(seconds>0||!playing)return;active.current=false;setPlaying(false);setDone(true)},[seconds,playing])
  const start=()=>{
    scoreRef.current=0;active.current=true;last.current=0
    setScore(0);setSeconds(SECONDS);setDone(false);setPlaying(true);setRound(n=>n+1)
    sound.play('select')
  }
  const stop=()=>{active.current=false;setPlaying(false);setSecret(false);setDone(false)}
  const tap=(i)=>{
    if(!active.current||i!==scoreRef.current%ORBS.length)return
    if(Date.now()-last.current<110)return
    last.current=Date.now();scoreRef.current++;setScore(scoreRef.current)
    sound.play('tick')
    if(scoreRef.current===ORBS.length){active.current=false;setPlaying(false);setDone(true);sound.play('success')}
  }
  const activeOrb=ORBS[score%ORBS.length]
  return <main className={'ad-cosmos'+(secret?' secret-active':'')} ref={root} onPointerMove={move} aria-label="Booking temporarily paused">
    <div className="cosmos-scene" aria-hidden="true">
      <div className="cosmos-nebula nebula-a"/><div className="cosmos-nebula nebula-b"/><div className="cosmos-nebula nebula-c"/>
      <div className="cosmos-grid"/><div className="cosmos-pointer-glow"/>
      <div className="cosmos-stars">{SPARKS.map((s,i)=><i key={i} style={{left:s.left,top:s.top,animationDelay:s.delay,animationDuration:s.duration}}/>)}</div>
      <div className="cosmos-meteor meteor-one"/><div className="cosmos-meteor meteor-two"/><div className="cosmos-meteor meteor-three"/>
      <div className="cosmos-horizon"/><div className="cosmos-vignette"/>
    </div>

    <header className="cosmos-header">
      <div className="cosmos-brand"><span className="cosmos-brand-sign">✳</span><span>AURORA <b>AFTER DARK</b></span></div>
      <div className="cosmos-header-right"><span className="cosmos-system"><i/> SYSTEM STANDBY</span><LiveBadge status={live}/><SoundToggle compact/></div>
    </header>

    <section className="cosmos-center" aria-labelledby="cosmos-title">
      <div className="cosmos-portal" aria-hidden="true">
        <div className="cosmos-portal-glow"/>
        <div className="cosmos-ring ring-outer"/><div className="cosmos-ring ring-mid"/><div className="cosmos-ring ring-inner"/>
        <div className="cosmos-orbit-dot orbit-dot-one"/><div className="cosmos-orbit-dot orbit-dot-two"/>
        <div className="cosmos-portal-core"><span className="cosmos-core-back">✧</span><Icon name="lock" size={42}/></div>
      </div>
      <p className="cosmos-overline"><span className="cosmos-overline-mark"/> TEMPORARILY OFFLINE <span className="cosmos-overline-mark"/></p>
      <h1 id="cosmos-title">The universe is<br/><em>taking a break.</em></h1>
      <p className="cosmos-copy">{message || "We'll be back soon."}</p>
      <div className="cosmos-info"><span className="cosmos-info-light"/><span>Your appointment is safe. This portal automatically reopens when your teacher is ready.</span></div>
      <div className="cosmos-scrollhint" aria-hidden="true"><span>✦</span><span>STAY CURIOUS</span><span>✦</span></div>
    </section>

    <button type="button" className="cosmos-easter" onClick={()=>{setSecret(v=>!v);active.current=false;setPlaying(false);setDone(false)}} aria-label={secret?'Close secret constellation':'Discover a hidden constellation'} title="A secret hides among the stars">✧</button>

    {secret&&<div className="cosmos-secret" role="region" aria-label="Hidden constellation game">
      <div className="cosmos-secret-status">
        <span className="cosmos-secret-label">✧ SECRET DISCOVERED / CONSTELLATION 07</span>
        {playing?<span className="cosmos-secret-hud">STARS {score}/7 · {seconds}s</span>:<span className="cosmos-secret-hud">THE SKY IS YOUR CANVAS</span>}
        <button type="button" onClick={stop} aria-label="Close constellation game">✕</button>
      </div>
      {!playing&&<div className="cosmos-secret-dialog">
        <span className="cosmos-secret-glyph" aria-hidden="true">✶</span>
        <p className="cosmos-secret-kicker">YOU FOUND THE HIDDEN UNIVERSE</p>
        <h2>{done?(score===7?'Constellation complete.':'The stars await.'):'Connect the impossible.'}</h2>
        <p>{done?(score===7?'Seven stars, one secret constellation. Try to beat the night again.':'Follow the stars faster next time.'):'Find the pulsing star, tap it, and follow its light across the sky. Seven stars. Thirty seconds. No one else needs to know.'}</p>
        <button type="button" className="cosmos-secret-begin" onClick={start}>{done?'Try again':'Enter the constellation'} <Icon name="right" size={18}/></button>
      </div>}
      {playing&&<div className="cosmos-secret-field">
        <svg className="cosmos-constellation-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {ORBS.slice(0,Math.max(0,score-1)).map((o,i)=>i<score-1&&<line key={i} x1={o.x} y1={o.y} x2={ORBS[i+1].x} y2={ORBS[i+1].y}/>)}
        </svg>
        {ORBS.map((o,i)=><button key={i} type="button" className={'cosmos-game-star'+(i===score?' next':i<score?' visited':' dormant')} style={{left:o.x+'%',top:o.y+'%'}} onClick={()=>tap(i)} disabled={i!==score} aria-label={i===score?'Catch glowing star '+(i+1):'Inactive star'}>✦</button>)}
        <div className="cosmos-game-hint">FOLLOW THE PULSING STAR · TAP OR CLICK</div>
      </div>}
    </div>}

    <footer className="cosmos-footer"><span>AN INTERMISSION, NOT THE END.</span><span className="cosmos-footer-links"><a href="#admin">Teacher portal ↗</a><VersionTag/></span></footer>
  </main>
}
