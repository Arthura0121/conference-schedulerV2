import {useEffect, useRef, useState} from 'react'
import Icon from '../components/Icon.jsx'
import LiveBadge from '../components/Live.jsx'
import {VersionTag} from '../components/About.jsx'
import SoundToggle from './SoundToggle.jsx'
import {sound} from '../sound.js'
import '../styles/lockscreen.css'

const ROUND_SECONDS = 25
const STAR_COUNT = 6
function place(id) {
  return {id, x: 9 + Math.random() * 82, y: 13 + Math.random() * 71, size: 24 + Math.random() * 17}
}
/** Purely local mini-game. Locking and unlocking are controlled ONLY by public_state on the server. */
export default function LockScreen({message, live}) {
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(ROUND_SECONDS)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [stars, setStars] = useState([])
  const playingRef = useRef(false)
  const begin = () => {
    playingRef.current = true
    setPlaying(true)
    setTime(ROUND_SECONDS)
    setScore(0)
    setStars(Array.from({length: STAR_COUNT}, (_, id) => place(id)))
  }
  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setTime(n => Math.max(0, n - 1)), 1000)
    return () => clearInterval(timer)
  }, [playing])
  useEffect(() => {if (time !== 0 || !playing) return; playingRef.current = false; setPlaying(false); setStars([])}, [time, playing])
  const catchStar = id => {
    if (!playingRef.current) return
    sound.play('tick')
    setScore(n => {const next = n + 1; setBest(b => Math.max(b, next)); return next})
    setStars(old => old.map(s => s.id === id ? place(id) : s))
  }
  return <main className="ad-locked" aria-label="Reservations temporarily paused">
    <div className="ad-lock-sky" aria-hidden="true"><div className="ad-lock-aurora ad-lock-aurora-one"/><div className="ad-lock-aurora ad-lock-aurora-two"/><div className="ad-lock-moon"/><div className="ad-lock-stars"/></div>
    <header className="ad-lock-top"><div className="ad-lock-brand"><span className="ad-lock-brand-mark"><Icon name="sparkle" size={21}/></span><span><b>AURORA</b><small>AFTER DARK</small></span></div><div className="ad-lock-topright"><span className="ad-lock-live"><LiveBadge status={live}/></span><SoundToggle compact/></div></header>
    <div className="ad-lock-content">
      <section className="ad-lock-intro">
        <div className="ad-lock-orbit" aria-hidden="true"><div className="ad-lock-orbit-ring"/><div className="ad-lock-orbit-ring second"/><span className="ad-lock-orbit-core"><Icon name="lock" size={37}/></span></div>
        <p className="ad-lock-kicker"><span className="ad-lock-pulse"/> THE CONFERENCE PORTAL IS RESTING</p>
        <h1>We'll be back <em>soon.</em></h1>
        <p className="ad-lock-message">{message || 'The website is temporarily closed.'}</p>
        <p className="ad-lock-note">Reservations are paused. Your existing appointment is safe, and this page will reopen automatically when your teacher unlocks it.</p>
      </section>
      <section className="ad-lock-gamebox" aria-label="Catch the stars mini game">
        <div className="ad-lock-gamehead"><div><span className="ad-lock-game-kicker">WHILE YOU WAIT</span><h2>Catch the stars <span aria-hidden="true">✦</span></h2></div><div className="ad-lock-best"><small>BEST THIS VISIT</small><strong className="num">{best}</strong></div></div>
        <p className="ad-lock-game-desc">A little cosmic challenge. Catch as many stars as you can in 25 seconds!</p>
        <div className="ad-lock-stats"><span><Icon name="sparkle" size={16}/> Score <b className="num">{score}</b></span><span><Icon name="clock" size={16}/> Time <b className="num">{time}s</b></span></div>
        <div className="ad-lock-playfield" role="group" aria-label="Star catching game field">
          <div className="ad-lock-fieldstars" aria-hidden="true"/>
          {playing ? stars.map(s => <button key={s.id} type="button" className="ad-lock-target" style={{left:s.x+'%',top:s.y+'%',fontSize:s.size+'px'}} onClick={() => catchStar(s.id)} aria-label="Catch a star">✦</button>)
            : <div className="ad-lock-playprompt"><span aria-hidden="true">✧ ✦ ✧</span><p>{time === 0 ? 'Nice constellation! Play again?' : 'Ready to light up the night?'}</p><button type="button" className="ad-lock-start" onClick={begin}>{time === 0 ? 'Play again' : 'Start the game'} <Icon name="right" size={17}/></button></div>}
        </div>
        <p className="ad-lock-gamefoot">No accounts, no leaderboard, no data sent. Just stars. <span aria-hidden="true">✧</span></p>
      </section>
    </div>
    <footer className="ad-lock-bottom"><span>See you under the stars ✦</span><a href="#admin">Teacher login</a><VersionTag/></footer>
  </main>
}
