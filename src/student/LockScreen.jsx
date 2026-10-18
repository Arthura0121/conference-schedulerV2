import {useEffect, useRef, useState} from 'react'
import Icon from '../components/Icon.jsx'
import ThemeScene from '../components/ThemeScene.jsx'
import LiveBadge from '../components/Live.jsx'
import {VersionTag} from '../components/About.jsx'
import SoundToggle from './SoundToggle.jsx'
import {sound} from '../sound.js'
import '../styles/lockscreen.css'

const LENGTH = 30
const GAME = {
  aurora:{name:'STARFALL', glyph:'✺', good:'✦', bad:'◆', goodName:'blue comet', badName:'red meteor', hint:'CATCH BLUE ✦  ·  AVOID RED ◆  ·  BUILD YOUR COMBO', intro:'Catch the glowing blue comets before they fall. Chain catches for massive combos. Avoid the red meteors. You have 30 seconds.', footer:'THE NIGHT IS STILL ALIVE.'},
  fall:{name:'LEAF RUN', glyph:'🍂', good:'🍂', bad:'🌰', goodName:'golden leaf', badName:'storm acorn', hint:'CATCH GOLD LEAVES  ·  AVOID ACORNS  ·  BUILD YOUR COMBO', intro:'Catch the golden leaves drifting through the harvest air. Chain catches for combos. Avoid the falling acorns. You have 30 seconds.', footer:'AUTUMN IS IN THE AIR.'},
  halloween:{name:'CANDY HUNT', glyph:'🎃', good:'🍬', bad:'🎃', goodName:'Halloween candy', badName:'cursed pumpkin', hint:'CATCH CANDY  ·  AVOID CURSED PUMPKINS  ·  BUILD YOUR COMBO', intro:'Catch the Halloween candy before it vanishes into the fog. Chain catches for combos. Avoid the cursed pumpkins. You have 30 seconds.', footer:'THE HAUNT IS STILL AWAKE.'},
  winter:{name:'SNOWFALL', glyph:'❄', good:'✦', bad:'◆', goodName:'snowflake', badName:'ice shard', hint:'CATCH SNOWFLAKES  ·  AVOID ICE SHARDS  ·  BUILD YOUR COMBO', intro:'Catch the bright snowflakes before they drift away. Chain catches for combos. Avoid the sharp ice shards. You have 30 seconds.', footer:'THE SNOW KEEPS FALLING.'}
}
function spawn(id) {
  return {id, x: 8 + Math.random()*84, danger: Math.random()<.23, duration: 2.2+Math.random()*1.6, born: Date.now()}
}
/** Purely local background Easter egg; booking access is always enforced by Supabase. */
export default function LockScreen({message,live,theme='aurora'}) {
  const game = GAME[theme] || GAME.aurora
  const [secret,setSecret] = useState(false)
  const [playing,setPlaying] = useState(false)
  const [seconds,setSeconds] = useState(LENGTH)
  const [score,setScore] = useState(0)
  const [combo,setCombo] = useState(0)
  const [best,setBest] = useState(0)
  const [finished,setFinished] = useState(false)
  const [falling,setFalling] = useState([])
  const [flash,setFlash] = useState('')
  const sequence=useRef(0),active=useRef(false)
  const scoreRef=useRef(0),comboRef=useRef(0)
  useEffect(()=>{
    if(!playing)return
    const timer=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000)
    const spawner=setInterval(()=>{
      const now=Date.now()
      setFalling(v=>[...v.filter(o=>now-o.born<o.duration*1000+150),spawn(++sequence.current)])
    },370)
    return()=>{clearInterval(timer);clearInterval(spawner)}
  },[playing])
  useEffect(()=>{if(!playing||seconds>0)return;active.current=false;setPlaying(false);setFinished(true);setFalling([]);sound.play('roundEnd')},[seconds,playing])
  const start=()=>{
    active.current=true;scoreRef.current=0;comboRef.current=0
    setScore(0);setCombo(0);setSeconds(LENGTH);setFalling([spawn(++sequence.current),spawn(++sequence.current)])
    setFinished(false);setPlaying(true);setFlash('');sound.play('arcadeStart')
  }
  const close=()=>{active.current=false;setPlaying(false);setSecret(false);setFalling([])}
  const catchLight=o=>{
    if(!active.current)return
    setFalling(v=>v.filter(s=>s.id!==o.id))
    if(o.danger){
      comboRef.current=0;scoreRef.current=Math.max(0,scoreRef.current-15)
      setFlash('hit');sound.play('meteor')
    }else{
      comboRef.current++;scoreRef.current+=10+Math.min(50,(comboRef.current-1)*5)
      setFlash('catch');sound.play(comboRef.current%5===0?'combo':'collect')
    }
    setCombo(comboRef.current);setScore(scoreRef.current)
    setBest(v=>Math.max(v,scoreRef.current))
  }
  return <main className={'ad-cosmos ad-cosmos-blue'+(secret?' secret-active':'')} data-theme={theme} aria-label="Booking temporarily paused">
    <div className="cosmos-scene" aria-hidden="true">
      <div className="cosmos-nebula nebula-a"/><div className="cosmos-nebula nebula-b"/><div className="cosmos-nebula nebula-c"/>
      <div className="cosmos-grid"/><div className="cosmos-pointer-glow"/>
      <ThemeScene theme={theme} className="cosmos-random-stars" />
      <div className="cosmos-horizon"/><div className="cosmos-vignette"/>
    </div>
    <header className="cosmos-header">
      <div className="cosmos-brand"><span>CONFERENCE RESERVATIONS</span></div>
      <div className="cosmos-header-right"><LiveBadge status={live}/><SoundToggle compact/></div>
    </header>
    <section className="cosmos-center cosmos-message-only" aria-labelledby="cosmos-title">
      <h1 id="cosmos-title">{message || "We'll be back soon!"}</h1>
      <p className="cosmos-info"><span className="cosmos-info-light"/> Reservations are temporarily paused. Your existing appointment is safe. This page updates automatically.</p>
    </section>
    <button type="button" className="cosmos-easter" onClick={()=>{active.current=false;setPlaying(false);setSecret(v=>!v);setFalling([])}} aria-label={secret?'Close hidden game':'Discover a hidden game'} title="✧">✧</button>
    {secret&&<div className="cosmos-secret ad-starfade" role="region" aria-label={'Hidden '+game.name+' arcade'}>
      <div className="cosmos-secret-status">
        <span className="cosmos-secret-label">✧ {game.name} // HIDDEN ARCADE</span>
        <span className="cosmos-secret-hud">{playing?Math.floor(score)+' PTS  ·  COMBO ×'+combo+'  ·  '+seconds+'s':'BEST '+best+' PTS'}</span>
        <button type="button" onClick={close} aria-label="Close hidden game">✕</button>
      </div>
      {!playing?<div className="cosmos-secret-dialog">
        <span className="cosmos-secret-glyph" aria-hidden="true">{game.glyph}</span>
        <p className="cosmos-secret-kicker">SECRET UNLOCKED</p>
        <h2>{finished?'Run complete.':game.name}</h2>
        <p>{finished?`You collected ${score} points! Your best is ${best}. Ready to beat it?`:game.intro}</p>
        <button type="button" className="cosmos-secret-begin" onClick={start}>{finished?'Play again':'Start game'} <Icon name="right" size={18}/></button>
      </div>:<div className={'starfall-field '+flash} onAnimationEnd={()=>setFlash('')}>
        {falling.map(o=><button key={o.id} type="button" className={'starfall-object '+(o.danger?'hazard':'light')} style={{left:o.x+'%',animationDuration:o.duration+'s'}} onClick={()=>catchLight(o)} aria-label={o.danger?'Avoid '+game.badName:'Catch '+game.goodName}>{o.danger?game.bad:game.good}</button>)}
        <div className="starfall-hint">{game.hint}</div>
        <div className="starfall-timeline" style={{'--remain':seconds/LENGTH*100+'%'}}/>
      </div>}
    </div>}
    <footer className="cosmos-footer"><span>{game.footer}</span><span className="cosmos-footer-links"><a href="#admin">Teacher portal ↗</a><VersionTag/></span></footer>
  </main>
}
