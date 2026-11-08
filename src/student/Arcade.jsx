import {ControlButton} from '../components/ControlSurface.jsx'
import {useEffect, useReducer, useRef, useState} from 'react'
import {Button, Sheet} from '../components/ui.jsx'
import {sound} from '../sound.js'
import {ARCADE_GAMES, MODES, PAD_COUNT, TURNS, LIVES, featuredMode, makeBoard, waveFor, phaseLength, arcadeReducer, roundRank} from './arcade.js'
import {BOARD_AUDIO, REWARD_AUDIO, startPhrase, boardPhrase, wavePhrase, pickPhrase, feedbackPhrase, resultPhrase} from './arcadeAudio.js'
import '../styles/arcade.css'

const pads=Array.from({length:PAD_COUNT},(_,i)=>i)
const waves=[1,2,3]
const outcomes={
 wrong:'Wrong pad',timeout:'Time ran out',pattern:'Pattern broken',early:'Too early',late:'Too late'
}

function readBest(key) {
 try{return Number(localStorage.getItem(key))||0}catch{return 0}
}

function statusFor(round,progress) {
 if(round.phase==='preview')return 'Watch the sequence'
 if(round.phase==='feedback')return round.outcome==='clear' ? (round.perfect?'Perfect! ':'')+'+'+round.earned+' points' : outcomes[round.outcome]+' · −1 life'
 if(round.mode==='echo')return 'Repeat the sequence'
 if(round.mode==='rush')return round.board.targets.length===1 ? 'Catch the target' : 'Catch both targets'
 const [left,right]=round.board.zone
 return progress<left?'Wait for the zone':progress<=right?'Hit now!':'Window closed'
}

function ArcadeBoard({game,round,clock,onPick,arenaRef}) {
 const {board,phase,mode,picks}=round
 const elapsed=Math.max(0,clock-round.startedAt)
 const progress=phase==='feedback'?round.impact:Math.min(1,elapsed/phaseLength(round))
 const active=phase==='play'
 const [left,right]=board.zone||[]
 const pulse=board.pulse?Math.floor(elapsed/board.pulse):0
 const flash=phase==='preview'&&elapsed%board.pulse<board.pulse*.78 ? board.targets[pulse] : -1
 const hit=active&&mode==='beat'&&progress>=left&&progress<=right
 return <section className="arcade-arena" ref={arenaRef} tabIndex={-1} aria-label="Game board">
  <div className="arcade-beat">
   <b>Wave {waveFor(round.turn)} <span>· {round.turn+1}/{TURNS}</span></b>
   <span className="arcade-status" data-feedback={phase==='feedback'?round.outcome:hit?'hit':undefined} aria-live="polite">{statusFor(round,progress)}</span>
  </div>
  <div className={'arcade-meter'+(board.zone?' arcade-meter-beat':'')} aria-hidden="true"
   style={{'--progress':progress,'--zone-start':left,'--zone-width':right-left||undefined}}>
   {board.zone?<><span className="arcade-zone"/><i className="arcade-needle"/></>:<i className="arcade-fill"/>}
  </div>
  <div className="arcade-grid">
   {pads.map(i=>{
    const caught=picks.includes(i)
    const target=mode!=='echo'&&board.targets.includes(i)
    const hazard=board.hazards.includes(i)
    const pad=caught?'caught':i===flash?'pulse':target?'prize':hazard?'hazard':'empty'
    const noun=caught?'Caught':target?'Catch '+game.prize:hazard?'Avoid '+game.hazard:i===flash?'Remember':'Pad'
    return <ControlButton key={i} type="button" className="arcade-pad" data-pad={pad}
     aria-label={noun+', pad '+(i+1)}
     aria-disabled={!active||caught} onClick={()=>onPick(i)}>
     <span className="arcade-key" aria-hidden="true">{i+1}</span>
     <span key={round.turn+'-'+pad} className="arcade-glyph" aria-hidden="true">{caught?'✓':target||i===flash?game.good:hazard?game.bad:'·'}</span>
    </ControlButton>
   })}
  </div>
  <div className="arcade-guide">
   <span>{mode==='echo' ? (phase==='preview'?Math.min(board.targets.length,pulse+1):picks.length)+' / '+board.targets.length+' in the sequence' : 'Tap a pad or press 1–6'}</span>
   <span>{round.combo>1 ? '×'+Math.min(5,round.combo)+' multiplier' : 'Chain clears to multiply points'}</span>
  </div>
 </section>
}

export default function Arcade({theme,onClose}) {
 const game=ARCADE_GAMES[theme]
 const [mode,setMode]=useState(()=>featuredMode(theme))
 const [pace,setPace]=useState('quick')
 const [round,dispatch]=useReducer(arcadeReducer,null)
 const [clock,setClock]=useState(0)
 const [records,setRecords]=useState({})
 const arenaRef=useRef(null)
 const replayRef=useRef(null)
 const playing=Boolean(round&&round.phase!=='done')
 const phase=round?.phase
 const turn=round?.turn
 const startedAt=round?.startedAt
 const length=round?phaseLength(round):0
 const key='conference_arcade_v2_'+theme+'_'+mode+'_'+pace
 const best=records[key]??readBest(key)

 function start() {
  const now=performance.now()
  setClock(now)
  dispatch({type:'start',mode,pace,best,board:makeBoard(mode,pace,0),now})
  sound.playPhrase(startPhrase(mode),{theme,lane:REWARD_AUDIO})
 }

 function chooseMode(next) {
  if(next===mode)return
  setMode(next)
  if(round)dispatch({type:'reset'})
  sound.play('select')
 }

 function choosePace(next) {
  if(next===pace)return
  setPace(next)
  if(round)dispatch({type:'reset'})
  sound.play('select')
 }

 useEffect(()=>{
  if(!playing)return
  const timer=setInterval(()=>setClock(performance.now()),32)
  const advance=setTimeout(()=>{
   const now=Math.max(performance.now(),startedAt+length)
   setClock(now)
   dispatch({type:'tick',phase,turn,now,board:phase==='feedback'?makeBoard(mode,pace,turn+1):undefined})
  },Math.max(0,Math.ceil(startedAt+length-performance.now())))
  return ()=>{clearInterval(timer);clearTimeout(advance)}
 },[playing,phase,turn,startedAt,length,mode,pace])

 useEffect(()=>{
  if(!playing)return
  arenaRef.current?.focus()
 },[playing])

 useEffect(()=>{
  if(!playing)return
  const press=event=>{
   if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||!/^[1-6]$/.test(event.key))return
   event.preventDefault()
   dispatch({type:'pick',phase,turn,pad:Number(event.key)-1,now:performance.now()})
  }
  window.addEventListener('keydown',press)
  return ()=>window.removeEventListener('keydown',press)
 },[playing,phase,turn])

 useEffect(()=>{
  function stopArcadeAudio(){sound.stop(BOARD_AUDIO);sound.stop(REWARD_AUDIO)}
  function hideAudio(){if(document.hidden)stopArcadeAudio()}
  document.addEventListener('visibilitychange',hideAudio)
  return ()=>{
   document.removeEventListener('visibilitychange',hideAudio)
   stopArcadeAudio()
  }
 },[])

 useEffect(()=>{
  sound.stop(BOARD_AUDIO)
  if(document.hidden||(phase!=='preview'&&phase!=='play'))return
  const phrase=boardPhrase(round)
  if(phrase)sound.playPhrase(phrase,{theme,lane:BOARD_AUDIO,elapsed:Math.max(0,performance.now()-startedAt)/1000})
  if(phase==='preview'||mode!=='echo'){
   const wave=wavePhrase(turn)
   if(wave)sound.playPhrase(wave,{theme,lane:REWARD_AUDIO})
  }
 },[phase,turn,startedAt,mode,theme])

 const lastPick=round?.picks.at(-1)
 useEffect(()=>{
  if(document.hidden)return
  if(phase==='play'&&lastPick!==undefined)sound.playPhrase(pickPhrase(mode,lastPick),{theme,lane:REWARD_AUDIO})
  if(phase==='feedback')sound.playPhrase(feedbackPhrase(round),{theme,lane:REWARD_AUDIO})
  if(phase==='done')sound.playPhrase(resultPhrase(round),{theme,lane:REWARD_AUDIO})
 },[phase,turn,lastPick,mode,theme])

 useEffect(()=>{
  if(phase!=='done')return
  const record=Math.max(round.score,readBest(key))
  try{localStorage.setItem(key,String(record))}catch{}
  setRecords(previous=>({...previous,[key]:record}))
  replayRef.current?.focus({preventScroll:true})
 },[phase,round?.score,key])

 return <Sheet label={game.name+' arcade'} title={game.name} wide onClose={onClose}>
  <div className="arcade">
   <div className="arcade-meta"><span>CONFERENCE ARCADE</span><b>{MODES[mode].name}</b></div>
   <div className="arcade-hud">
    <span>Score <b data-score>{round?.score??0}</b></span>
    <span>Chain <b>×{round?.combo??0}</b></span>
    <span>Lives <b aria-label={(round?.lives??LIVES)+' lives'}>{'♥'.repeat(round?.lives??LIVES)||'0'}</b></span>
    <span>Best <b>{best}</b></span>
   </div>
   {playing ? <ArcadeBoard game={game} round={round} clock={clock} arenaRef={arenaRef}
    onPick={pad=>dispatch({type:'pick',phase,turn,pad,now:performance.now()})}/> :
   <div className="arcade-intro">
    {phase==='done' ? <div className="arcade-results" role="status">
     <b>{roundRank(round)}</b>
     <p>{round.lives?'Run complete!':'Out of lives'} · {round.score} points{round.score>round.previousBest?' · New best!':''}</p>
     <small>{round.cleared}/{TURNS} cleared · {round.perfects} perfect · longest chain ×{round.peak}</small>
    </div> : <div className="arcade-challenge">
     <span className="arcade-emblem" aria-hidden="true">{game.good}</span>
     <div><p>Three waves. Three lives.</p><small>Perfect clears earn a bonus. Keep your chain for up to ×5 points.</small></div>
     <div className="arcade-waves" aria-hidden="true">{waves.map(w=><i key={w}>0{w}</i>)}</div>
    </div>}
    <div className="arcade-modes" role="group" aria-label="Game mode">
     {Object.entries(MODES).map(([id,item])=><ControlButton key={id} type="button" className="arcade-mode"
      aria-pressed={mode===id} onClick={()=>chooseMode(id)}>
      <span aria-hidden="true">{item.icon}</span><b>{item.name}</b><small>{item.hint}</small>
     </ControlButton>)}
    </div>
    <div className="arcade-actions">
     <div className="arcade-pace" role="group" aria-label="Game speed">
      <Button size="sm" aria-pressed={pace==='relaxed'} onClick={()=>choosePace('relaxed')}>Relaxed</Button>
      <Button size="sm" aria-pressed={pace==='quick'} onClick={()=>choosePace('quick')}>Quick</Button>
     </div>
     <ControlButton type="button" className="btn primary arcade-start" onClick={start} ref={replayRef}>{phase==='done'?'Play again':'Start game'} <span aria-hidden="true">→</span></ControlButton>
    </div>
   </div>}
  </div>
 </Sheet>
}
